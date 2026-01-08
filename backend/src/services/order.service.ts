import { getSupabaseClient } from './supabase.js';
import { storeService } from './store.service.js';
import { productService } from './product.service.js';
import { shopifyService } from './shopify.service.js';
import { config } from '../config/index.js';
import type {
  OrderIntent,
  OrderItem,
  CreateOrderIntentRequest,
  PaymentRequirements,
  PaymentProof,
  EnrichedOrder,
  Product,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class OrderService {
  private supabase = getSupabaseClient();

  /**
   * Phase 1: Create order intent and return payment requirements
   */
  async createOrderIntent(request: CreateOrderIntentRequest): Promise<{
    orderIntent: OrderIntent;
    paymentRequirements: PaymentRequirements;
  }> {
    // Get store
    const store = await storeService.getStoreById(request.store_id);
    if (!store) {
      throw new Error('Store not found');
    }

    // Get products and validate
    const productIds = [...new Set(request.items.map((item) => item.product_id))];
    const products = await productService.getProductsByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Build order items with prices
    const orderItems: OrderItem[] = [];
    let totalAmountMicro = BigInt(0);

    for (const item of request.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }

      const variant = product.variants.find((v) => v.id === item.variant_id);
      if (!variant) {
        throw new Error(`Variant not found: ${item.variant_id}`);
      }

      if (!variant.available) {
        throw new Error(`Variant not available: ${variant.title}`);
      }

      // Convert price to MOVE (8 decimals)
      // Rate: 1 MOVE = 2 USD (e.g., $20 = 10 MOVE)
      // In production, you'd use an oracle or price feed
      const priceInMove = this.usdToMove(parseFloat(variant.price));
      const itemTotal = priceInMove * BigInt(item.quantity);
      totalAmountMicro += itemTotal;

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: priceInMove.toString(),
        title: `${product.title} - ${variant.title}`,
      });
    }

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + config.orderIntentExpiryMinutes * 60 * 1000
    ).toISOString();

    // Create order intent
    const orderIntentId = uuidv4();
    const { data: orderIntent, error } = await this.supabase
      .from('order_intents')
      .insert({
        id: orderIntentId,
        store_id: request.store_id,
        items: orderItems,
        total_amount: totalAmountMicro.toString(),
        currency: 'MOVE',
        pay_to_address: store.pay_to_address,
        network: config.movementNetwork,
        asset: config.movementAsset,
        status: 'pending',
        expires_at: expiresAt,
        shipping_address: request.shipping_address || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order intent: ${error.message}`);
    }

    // Build payment requirements for x402 402 response
    const paymentRequirements: PaymentRequirements = {
      network: config.movementNetwork,
      asset: config.movementAsset,
      payTo: store.pay_to_address,
      maxAmountRequired: totalAmountMicro.toString(),
      description: `Order from ${store.description}`,
      mimeType: 'application/json',
      maxTimeoutSeconds: config.paymentTimeoutSeconds,
      orderIntentId: orderIntentId,
    };

    return {
      orderIntent: orderIntent as OrderIntent,
      paymentRequirements,
    };
  }

  /**
   * Phase 2: Verify payment and finalize order
   */
  async finalizeOrder(
    orderIntentId: string,
    paymentHeader: string
  ): Promise<OrderIntent> {
    // Get order intent
    const orderIntent = await this.getOrderIntentById(orderIntentId);
    if (!orderIntent) {
      throw new Error('Order intent not found');
    }

    if (orderIntent.status !== 'pending') {
      throw new Error(`Order intent is not pending: ${orderIntent.status}`);
    }

    // Check expiry
    if (new Date(orderIntent.expires_at) < new Date()) {
      await this.updateOrderStatus(orderIntentId, 'expired');
      throw new Error('Order intent has expired');
    }

    // Verify payment with facilitator
    const verificationResult = await this.verifyPaymentWithFacilitator(
      paymentHeader,
      orderIntent
    );

    if (!verificationResult.success) {
      await this.updateOrderStatus(orderIntentId, 'failed');
      throw new Error(`Payment verification failed: ${verificationResult.error}`);
    }

    // Update order intent with payment proof
    const paymentProof: PaymentProof = {
      transaction: verificationResult.transactionHash || '',
      signature: paymentHeader,
      verified_at: new Date().toISOString(),
      facilitator_response: verificationResult.facilitatorResponse,
    };

    // Get store details for Shopify integration
    const store = await storeService.getStoreById(orderIntent.store_id);
    if (!store) {
      throw new Error('Store not found');
    }

    // Create order in Shopify
    let shopifyOrderId: string | undefined;
    let shopifyOrderNumber: string | undefined;
    let shopifyOrderName: string | undefined;

    try {
      console.log(`Creating order in Shopify for order intent ${orderIntentId}...`);

      // Get product details to map to Shopify variant IDs
      const productIds = orderIntent.items.map((item) => item.product_id);
      const products = await productService.getProductsByIds(productIds);
      const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

      // Build line items with Shopify variant IDs
      const lineItems = orderIntent.items.map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) {
          throw new Error(`Product not found: ${item.product_id}`);
        }

        const variant = product.variants.find((v) => v.id === item.variant_id);
        if (!variant) {
          throw new Error(`Variant not found: ${item.variant_id}`);
        }

        return {
          variantId: variant.shopify_variant_id,
          quantity: item.quantity,
          title: item.title,
        };
      });

      // Build shipping address if available
      const shippingAddress = orderIntent.shipping_address
        ? {
            firstName: orderIntent.shipping_address.first_name,
            lastName: orderIntent.shipping_address.last_name,
            address1: orderIntent.shipping_address.address1,
            address2: orderIntent.shipping_address.address2,
            city: orderIntent.shipping_address.city,
            province: orderIntent.shipping_address.province,
            country: orderIntent.shipping_address.country,
            zip: orderIntent.shipping_address.zip,
            phone: orderIntent.shipping_address.phone,
          }
        : undefined;

      // Create order in Shopify
      const shopifyOrder = await shopifyService.createOrder(
        store.shopify_store_url,
        store.shopify_admin_access_token,
        {
          lineItems,
          shippingAddress,
          email: orderIntent.shipping_address?.email,
          note: `x402 Payment - MOVE Token\nOrder Intent: ${orderIntentId}`,
          tags: ['x402', 'crypto-payment', 'move-token', 'agentic-marketplace'],
          financialStatus: 'PAID',
          transactionHash: verificationResult.transactionHash,
        }
      );

      shopifyOrderId = shopifyOrder.orderId;
      shopifyOrderNumber = shopifyOrder.orderNumber;
      shopifyOrderName = shopifyOrder.orderName;

      console.log(
        `✓ Shopify order created: ${shopifyOrderName} (ID: ${shopifyOrderId})`
      );
    } catch (shopifyError) {
      console.error('Failed to create Shopify order:', shopifyError);
      // Log the error but don't fail the entire order
      // The payment is verified, so we still mark it as paid
      console.warn(
        'Payment is verified, but Shopify order creation failed. Order will be marked as paid in local database.'
      );
    }

    // Update order intent with payment proof and Shopify order details
    const { data: updatedOrder, error } = await this.supabase
      .from('order_intents')
      .update({
        status: 'paid',
        payment_proof: paymentProof,
        shopify_order_id: shopifyOrderId,
        shopify_order_number: shopifyOrderNumber,
        shopify_order_name: shopifyOrderName,
      })
      .eq('id', orderIntentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order intent: ${error.message}`);
    }

    return updatedOrder as OrderIntent;
  }

  /**
   * Verify payment with the x402 facilitator
   */
  private async verifyPaymentWithFacilitator(
    paymentHeader: string,
    orderIntent: OrderIntent
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
    facilitatorResponse?: unknown;
  }> {
    try {
      // Decode the X-PAYMENT header
      const paymentData = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );

      // Debug: Log what we're sending to the facilitator
      console.log('=== Facilitator Verify Request ===');
      console.log('X-PAYMENT decoded:', JSON.stringify(paymentData, null, 2));
      console.log('Order network:', orderIntent.network);
      console.log('Order payTo:', orderIntent.pay_to_address);
      console.log('Order amount:', orderIntent.total_amount);

      // Call facilitator verify endpoint
      const response = await fetch(`${config.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentPayload: {
            x402Version: paymentData.x402Version,
            scheme: paymentData.scheme,
            network: paymentData.network,
            payload: paymentData.payload,
          },
          paymentRequirements: {
            network: orderIntent.network,
            asset: orderIntent.asset,
            payTo: orderIntent.pay_to_address,
            maxAmountRequired: orderIntent.total_amount,
          },
        }),
      });

      const facilitatorResponse = await response.json() as { error?: string; details?: unknown };

      console.log('=== Facilitator Verify Response ===');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(facilitatorResponse, null, 2));

      if (!response.ok) {
        return {
          success: false,
          error: facilitatorResponse.error || 'Facilitator verification failed',
          facilitatorResponse,
        };
      }

      // Call settle to submit transaction
      const settleResponse = await fetch(`${config.facilitatorUrl}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentPayload: {
            x402Version: paymentData.x402Version,
            scheme: paymentData.scheme,
            network: paymentData.network,
            payload: paymentData.payload,
          },
        }),
      });

      const settleResult = await settleResponse.json() as { error?: string; transactionHash?: string; txHash?: string; details?: unknown };

      console.log('=== Facilitator Settle Response ===');
      console.log('Status:', settleResponse.status);
      console.log('Response:', JSON.stringify(settleResult, null, 2));

      if (!settleResponse.ok) {
        return {
          success: false,
          error: settleResult.error || 'Settlement failed',
          facilitatorResponse: settleResult,
        };
      }

      return {
        success: true,
        transactionHash: settleResult.transactionHash || settleResult.txHash,
        facilitatorResponse: settleResult,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: `Verification error: ${message}`,
      };
    }
  }

  /**
   * Get order intent by ID
   */
  async getOrderIntentById(orderIntentId: string): Promise<OrderIntent | null> {
    const { data: orderIntent, error } = await this.supabase
      .from('order_intents')
      .select('*')
      .eq('id', orderIntentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get order intent: ${error.message}`);
    }

    return orderIntent as OrderIntent;
  }

  /**
   * Get all order intents for a store
   */
  async getOrderIntentsByStoreId(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<{ orderIntents: OrderIntent[]; total: number }> {
    const { limit = 50, offset = 0, status } = options || {};

    let query = this.supabase
      .from('order_intents')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orderIntents, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get order intents: ${error.message}`);
    }

    return {
      orderIntents: (orderIntents || []) as OrderIntent[],
      total: count || 0,
    };
  }

  /**
   * Get paid orders for a store
   */
  async getOrdersByStoreId(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: OrderIntent[]; total: number }> {
    const result = await this.getOrderIntentsByStoreId(storeId, {
      ...options,
      status: 'paid',
    });
    return {
      orders: result.orderIntents,
      total: result.total,
    };
  }

  /**
   * Get enriched order details
   */
  async getEnrichedOrder(orderIntentId: string): Promise<EnrichedOrder | null> {
    const orderIntent = await this.getOrderIntentById(orderIntentId);
    if (!orderIntent) {
      return null;
    }

    const store = await storeService.getStoreById(orderIntent.store_id);
    if (!store) {
      throw new Error('Store not found for order');
    }

    // Get all product IDs from order items
    const productIds = orderIntent.items.map((item) => item.product_id);
    const products = await productService.getProductsByIds(productIds);
    const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

    // Build enriched order
    const enrichedProducts = orderIntent.items.map((item) => ({
      item,
      product: productMap.get(item.product_id) || null,
    }));

    return {
      ...orderIntent,
      store: storeService.toPublicStore(store),
      products: enrichedProducts,
    };
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(
    orderIntentId: string,
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('order_intents')
      .update({ status })
      .eq('id', orderIntentId);

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Convert USD to MOVE (8 decimals)
   * Rate: 1 USD = 1 MOVE (i.e., $1 = 1 MOVE token)
   * In production, use a price oracle
   */
  private usdToMove(usdAmount: number): bigint {
    // 1 USD = 1 MOVE (so $1 = 1 MOVE, $10 = 10 MOVE)
    // MOVE has 8 decimals
    return BigInt(Math.round(usdAmount * 100_000_000));
  }

  /**
   * Cancel an order intent
   */
  async cancelOrderIntent(orderIntentId: string): Promise<OrderIntent> {
    const orderIntent = await this.getOrderIntentById(orderIntentId);
    if (!orderIntent) {
      throw new Error('Order intent not found');
    }

    if (orderIntent.status !== 'pending') {
      throw new Error('Can only cancel pending orders');
    }

    const { data: updatedOrder, error } = await this.supabase
      .from('order_intents')
      .update({ status: 'cancelled' })
      .eq('id', orderIntentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }

    return updatedOrder as OrderIntent;
  }
}

export const orderService = new OrderService();
