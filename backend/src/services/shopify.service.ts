import type {
  Product,
  ProductVariant,
  ProductImage,
  ShopifyProduct,
  ShopifyVariant,
  ShopifyImage,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class ShopifyService {
  /**
   * Fetch products from Shopify Admin API
   */
  async fetchProducts(
    shopifyStoreUrl: string,
    adminAccessToken: string,
    options?: {
      limit?: number;
      sinceId?: string;
      productIds?: string[];
    }
  ): Promise<ShopifyProduct[]> {
    const { limit = 250, sinceId, productIds } = options || {};

    // Normalize store URL
    const baseUrl = this.normalizeStoreUrl(shopifyStoreUrl);
    const url = new URL(`${baseUrl}/admin/api/2024-10/products.json`);

    url.searchParams.set('limit', limit.toString());
    if (sinceId) {
      url.searchParams.set('since_id', sinceId);
    }
    if (productIds && productIds.length > 0) {
      url.searchParams.set('ids', productIds.join(','));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { products: ShopifyProduct[] };
    return data.products;
  }

  /**
   * Fetch a single product from Shopify
   */
  async fetchProduct(
    shopifyStoreUrl: string,
    adminAccessToken: string,
    productId: string
  ): Promise<ShopifyProduct | null> {
    const baseUrl = this.normalizeStoreUrl(shopifyStoreUrl);
    const url = `${baseUrl}/admin/api/2024-10/products/${productId}.json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { product: ShopifyProduct };
    return data.product;
  }

  /**
   * Normalize Shopify products to our internal structure
   */
  normalizeProducts(shopifyProducts: ShopifyProduct[], storeId: string): Omit<Product, 'created_at' | 'updated_at'>[] {
    return shopifyProducts.map((sp) => this.normalizeProduct(sp, storeId));
  }

  /**
   * Normalize a single Shopify product
   */
  normalizeProduct(
    shopifyProduct: ShopifyProduct,
    storeId: string
  ): Omit<Product, 'created_at' | 'updated_at'> {
    return {
      id: uuidv4(),
      store_id: storeId,
      shopify_product_id: shopifyProduct.id.toString(),
      title: shopifyProduct.title,
      description: this.stripHtml(shopifyProduct.body_html || ''),
      vendor: shopifyProduct.vendor || '',
      product_type: shopifyProduct.product_type || '',
      tags: this.parseTags(shopifyProduct.tags),
      variants: this.normalizeVariants(shopifyProduct.variants || []),
      images: this.normalizeImages(shopifyProduct.images || []),
    };
  }

  /**
   * Normalize Shopify variants
   */
  private normalizeVariants(variants: ShopifyVariant[]): ProductVariant[] {
    return variants.map((v) => ({
      id: uuidv4(),
      shopify_variant_id: v.id.toString(),
      title: v.title || 'Default',
      price: v.price,
      currency: 'USD', // Shopify prices are in shop's currency
      sku: v.sku || '',
      inventory_quantity: v.inventory_quantity || 0,
      available: v.available !== false && (v.inventory_quantity || 0) > 0,
    }));
  }

  /**
   * Normalize Shopify images
   */
  private normalizeImages(images: ShopifyImage[]): ProductImage[] {
    return images.map((img) => ({
      id: uuidv4(),
      src: img.src,
      alt: img.alt || '',
      position: img.position,
    }));
  }

  /**
   * Parse comma-separated tags string
   */
  private parseTags(tags: string): string[] {
    if (!tags) return [];
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  /**
   * Strip HTML tags from description
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize store URL to ensure consistent format
   */
  private normalizeStoreUrl(url: string): string {
    // Remove trailing slash
    let normalized = url.replace(/\/+$/, '');

    // Add https if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    // Ensure .myshopify.com domain if not present
    if (!normalized.includes('.myshopify.com') && !normalized.includes('.shopify.com')) {
      // Check if it's just a store name
      const match = normalized.match(/https?:\/\/([^./]+)$/);
      if (match) {
        normalized = `https://${match[1]}.myshopify.com`;
      }
    }

    return normalized;
  }

  /**
   * Verify Shopify store credentials by fetching a single product
   * Uses products endpoint since that's the scope we actually need
   */
  async verifyCredentials(shopifyStoreUrl: string, adminAccessToken: string): Promise<boolean> {
    try {
      const baseUrl = this.normalizeStoreUrl(shopifyStoreUrl);
      // Use products endpoint with limit=1 to verify read_products scope
      const url = `${baseUrl}/admin/api/2024-10/products.json?limit=1`;

      console.log(`Verifying Shopify credentials for: ${baseUrl}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': adminAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify verification failed (${response.status}): ${errorText}`);
        return false;
      }

      console.log('Shopify credentials verified successfully');
      return true;
    } catch (error) {
      console.error('Shopify verification error:', error);
      return false;
    }
  }
}

export const shopifyService = new ShopifyService();
