import { Router, Request, Response } from 'express';
import { McpHandler } from './mcp-handler.js';
import { storeService } from '../services/store.service.js';
import { productService } from '../services/product.service.js';
import { orderService } from '../services/order.service.js';
import type { JsonRpcRequest, McpTool } from '../types/index.js';

const router = Router();
const mcpHandler = new McpHandler();

// Movement Explorer URL for transaction links
const MOVEMENT_EXPLORER_URL = 'https://explorer.movementnetwork.xyz/txn';
const MOVEMENT_NETWORK_PARAM = 'bardock+testnet';

// Payment signing page URL
const PAYMENT_SIGNING_URL = 'https://agentic-marketplace-x402-1.onrender.com/pay';

/**
 * Convert micro MOVE (8 decimals) to whole MOVE tokens
 * Returns integer string without decimals
 */
function microMoveToMove(microMove: string): string {
  const value = BigInt(microMove);
  const moveAmount = value / BigInt(100_000_000);
  return moveAmount.toString();
}

// Define tools
const tools: McpTool[] = [
  {
    name: 'list_stores',
    description: 'List all available stores in the marketplace. Returns store info including name, description, and categories.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of stores to return (default: 50, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 0)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter stores by name or description',
        },
        category: {
          type: 'string',
          description: 'Filter stores by category',
        },
      },
    },
  },
  {
    name: 'get_store_products',
    description: 'Get all products available in a specific store. Returns product details including variants, prices, and availability.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: {
          type: 'string',
          description: 'The unique identifier of the store (UUID)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of products to return (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 0)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter products by title or description',
        },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'initiate_checkout',
    description: 'Start the checkout process for selected items. Returns payment requirements including amount, recipient address, and order intent ID. This is Phase 1 of the x402 payment flow. IMPORTANT: Always ask the user for their shipping address before calling this tool.',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: {
          type: 'string',
          description: 'The store ID to purchase from (UUID)',
        },
        items: {
          type: 'array',
          description: 'Array of items to purchase',
          items: {
            type: 'object',
            properties: {
              product_id: {
                type: 'string',
                description: 'Product ID (UUID)',
              },
              variant_id: {
                type: 'string',
                description: 'Variant ID (UUID)',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to purchase',
              },
            },
            required: ['product_id', 'variant_id', 'quantity'],
          },
        },
        shipping_address: {
          type: 'object',
          description: 'Shipping address for order delivery. Required for physical products.',
          properties: {
            first_name: {
              type: 'string',
              description: 'First name of the recipient',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the recipient',
            },
            address1: {
              type: 'string',
              description: 'Primary street address',
            },
            address2: {
              type: 'string',
              description: 'Apartment, suite, unit, etc. (optional)',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            province: {
              type: 'string',
              description: 'State or province (optional)',
            },
            country: {
              type: 'string',
              description: 'Country name or code',
            },
            zip: {
              type: 'string',
              description: 'Postal or ZIP code',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number (optional)',
            },
            email: {
              type: 'string',
              description: 'Contact email address (optional)',
            },
          },
          required: ['first_name', 'last_name', 'address1', 'city', 'country', 'zip'],
        },
      },
      required: ['store_id', 'items', 'shipping_address'],
    },
  },
  {
    name: 'finalize_checkout',
    description: 'Complete the checkout by providing the signed payment. This is Phase 2 of the x402 payment flow. Requires the X-PAYMENT header from a signed Movement transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        order_intent_id: {
          type: 'string',
          description: 'The order intent ID from initiate_checkout (UUID)',
        },
        x_payment_header: {
          type: 'string',
          description: 'The base64-encoded X-PAYMENT header containing the signed transaction',
        },
      },
      required: ['order_intent_id', 'x_payment_header'],
    },
  },
  {
    name: 'get_order_details',
    description: 'Get detailed information about an order including store info, product details, and payment status.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'string',
          description: 'The order ID to retrieve (UUID)',
        },
      },
      required: ['order_id'],
    },
  },
];

// Register tool handlers
mcpHandler.registerTool(tools[0], async (params) => {
  const result = await storeService.listStores({
    limit: (params.limit as number) || 50,
    offset: (params.offset as number) || 0,
    search: params.search as string | undefined,
    category: params.category as string | undefined,
  });

  return {
    stores: result.stores,
    total: result.total,
    pagination: {
      limit: (params.limit as number) || 50,
      offset: (params.offset as number) || 0,
    },
  };
});

mcpHandler.registerTool(tools[1], async (params) => {
  const storeId = params.store_id as string;
  if (!storeId) {
    throw new Error('store_id is required');
  }

  const result = await productService.getProductsByStoreId(storeId, {
    limit: (params.limit as number) || 50,
    offset: (params.offset as number) || 0,
    search: params.search as string | undefined,
  });

  return {
    products: result.products,
    total: result.total,
    pagination: {
      limit: (params.limit as number) || 50,
      offset: (params.offset as number) || 0,
    },
  };
});

mcpHandler.registerTool(tools[2], async (params) => {
  const storeId = params.store_id as string;
  const items = params.items as Array<{
    product_id: string;
    variant_id: string;
    quantity: number;
  }>;
  const shippingAddress = params.shipping_address as {
    first_name: string;
    last_name: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    country: string;
    zip: string;
    phone?: string;
    email?: string;
  } | undefined;

  if (!storeId || !items || items.length === 0) {
    throw new Error('store_id and items are required');
  }

  if (!shippingAddress) {
    throw new Error('shipping_address is required. Please provide the delivery address including first_name, last_name, address1, city, country, and zip.');
  }

  const { orderIntent, paymentRequirements } = await orderService.createOrderIntent({
    store_id: storeId,
    items,
    shipping_address: shippingAddress,
  });

  // Convert micro MOVE to whole MOVE tokens for display
  const moveTokens = microMoveToMove(orderIntent.total_amount);

  // Return 402-like payload inside tool result
  return {
    status: 'payment_required',
    order_intent: {
      id: orderIntent.id,
      total_amount_micro: orderIntent.total_amount,
      total_amount_move: moveTokens,
      currency: orderIntent.currency,
      expires_at: orderIntent.expires_at,
      items: orderIntent.items,
    },
    payment_requirements: {
      ...paymentRequirements,
      maxAmountRequired_move: moveTokens,
    },
    instructions: [
      `1. Create a MOVE transaction transferring ${moveTokens} MOVE to this address: ${paymentRequirements.payTo}`,
      `2. Sign the transaction with your wallet (but don't submit it to the blockchain yet)`,
      `3. Generate the base64-encoded X-PAYMENT header by signing the transaction here: ${PAYMENT_SIGNING_URL}?payTo=${paymentRequirements.payTo}&amount=${moveTokens}&orderId=${orderIntent.id}`,
      `4. Provide the X-PAYMENT header to finalize checkout`,
    ],
    payment_signing_url: `${PAYMENT_SIGNING_URL}?payTo=${paymentRequirements.payTo}&amount=${moveTokens}&orderId=${orderIntent.id}`,
  };
});

mcpHandler.registerTool(tools[3], async (params) => {
  const orderIntentId = params.order_intent_id as string;
  const xPaymentHeader = params.x_payment_header as string;

  if (!orderIntentId || !xPaymentHeader) {
    throw new Error('order_intent_id and x_payment_header are required');
  }

  const orderIntent = await orderService.finalizeOrder(orderIntentId, xPaymentHeader);

  // Convert micro MOVE to whole MOVE tokens for display
  const moveTokens = microMoveToMove(orderIntent.total_amount);

  // Build full transaction URL
  const facilitatorResponse = orderIntent.payment_proof?.facilitator_response as { transaction?: string } | undefined;
  const txHash = facilitatorResponse?.transaction;
  const transactionUrl = txHash
    ? `${MOVEMENT_EXPLORER_URL}/${txHash}?network=${MOVEMENT_NETWORK_PARAM}`
    : null;

  return {
    status: 'success',
    message: 'Payment verified and order finalized',
    order: {
      id: orderIntent.id,
      status: orderIntent.status,
      total_amount_micro: orderIntent.total_amount,
      total_amount_move: moveTokens,
      currency: orderIntent.currency,
      transaction: txHash,
      transaction_url: transactionUrl,
    },
  };
});

mcpHandler.registerTool(tools[4], async (params) => {
  const orderId = params.order_id as string;
  if (!orderId) {
    throw new Error('order_id is required');
  }

  const enrichedOrder = await orderService.getEnrichedOrder(orderId);
  if (!enrichedOrder) {
    throw new Error('Order not found');
  }

  return enrichedOrder;
});

// MCP endpoint
router.post('/mcp', async (req: Request, res: Response) => {
  try {
    const request = req.body as JsonRpcRequest;

    // Validate basic JSON-RPC structure
    if (!request || typeof request !== 'object' || !request.method) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON-RPC request',
        },
      });
      return;
    }

    console.log(`MCP Request: ${request.method}`, request.params || {});

    const response = await mcpHandler.handleRequest(request);
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('MCP Error:', message);

    res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32000,
        message: `Server error: ${message}`,
      },
    });
  }
});

// Convenience endpoint to get tools list via GET
router.get('/mcp/tools', (_req: Request, res: Response) => {
  res.json({
    success: true,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
});

export default router;
