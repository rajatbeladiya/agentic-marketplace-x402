import type {
  Product,
  ProductVariant,
  ProductImage,
  ShopifyProduct,
  ShopifyVariant,
  ShopifyImage,
  ShopifyGraphQLProduct,
  ShopifyGraphQLVariant,
  ShopifyGraphQLMedia,
  ShopifyGraphQLResponse,
  ShopifyProductsQueryResponse,
  ShopifyProductQueryResponse,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// Shopify GraphQL API version (latest as of January 2026)
const SHOPIFY_API_VERSION = '2026-01';

// GraphQL query for fetching multiple products
const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        legacyResourceId
        title
        description
        descriptionHtml
        vendor
        productType
        tags
        createdAt
        updatedAt
        variants(first: 100) {
          nodes {
            id
            legacyResourceId
            title
            price
            sku
            inventoryQuantity
            availableForSale
          }
        }
        media(first: 50) {
          nodes {
            id
            alt
            mediaContentType
            preview {
              image {
                url
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// GraphQL query for fetching a single product by ID
const PRODUCT_BY_ID_QUERY = `
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      legacyResourceId
      title
      description
      descriptionHtml
      vendor
      productType
      tags
      createdAt
      updatedAt
      variants(first: 100) {
        nodes {
          id
          legacyResourceId
          title
          price
          sku
          inventoryQuantity
          availableForSale
        }
      }
      media(first: 50) {
        nodes {
          id
          alt
          mediaContentType
          preview {
            image {
              url
            }
          }
        }
      }
    }
  }
`;

// Simple verification query
const SHOP_QUERY = `
  query VerifyAccess {
    shop {
      name
    }
  }
`;

export class ShopifyService {
  /**
   * Make a GraphQL request to Shopify Admin API
   */
  private async graphqlRequest<T>(
    shopifyStoreUrl: string,
    adminAccessToken: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<ShopifyGraphQLResponse<T>> {
    const baseUrl = this.normalizeStoreUrl(shopifyStoreUrl);
    const url = `${baseUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify GraphQL API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<ShopifyGraphQLResponse<T>>;
  }

  /**
   * Fetch products from Shopify Admin GraphQL API
   */
  async fetchProducts(
    shopifyStoreUrl: string,
    adminAccessToken: string,
    options?: {
      limit?: number;
      sinceId?: string; // Not used in GraphQL, kept for API compatibility
      productIds?: string[]; // Not used in this implementation
    }
  ): Promise<ShopifyProduct[]> {
    const { limit = 250 } = options || {};

    // Fetch products using GraphQL
    const result = await this.graphqlRequest<ShopifyProductsQueryResponse>(
      shopifyStoreUrl,
      adminAccessToken,
      PRODUCTS_QUERY,
      { first: Math.min(limit, 250) } // GraphQL max is 250 per page
    );

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map(e => e.message).join(', ');
      throw new Error(`Shopify GraphQL error: ${errorMessages}`);
    }

    if (!result.data?.products?.nodes) {
      return [];
    }

    // Convert GraphQL response to legacy ShopifyProduct format for compatibility
    return result.data.products.nodes.map(this.graphqlToLegacyProduct.bind(this));
  }

  /**
   * Fetch a single product from Shopify GraphQL API
   */
  async fetchProduct(
    shopifyStoreUrl: string,
    adminAccessToken: string,
    productId: string
  ): Promise<ShopifyProduct | null> {
    // Convert numeric ID to GraphQL global ID format
    const globalId = productId.startsWith('gid://')
      ? productId
      : `gid://shopify/Product/${productId}`;

    const result = await this.graphqlRequest<ShopifyProductQueryResponse>(
      shopifyStoreUrl,
      adminAccessToken,
      PRODUCT_BY_ID_QUERY,
      { id: globalId }
    );

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map(e => e.message).join(', ');
      throw new Error(`Shopify GraphQL error: ${errorMessages}`);
    }

    if (!result.data?.product) {
      return null;
    }

    return this.graphqlToLegacyProduct(result.data.product);
  }

  /**
   * Convert GraphQL product to legacy REST API format for backward compatibility
   */
  private graphqlToLegacyProduct(gqlProduct: ShopifyGraphQLProduct): ShopifyProduct {
    return {
      id: parseInt(gqlProduct.legacyResourceId, 10),
      title: gqlProduct.title,
      body_html: gqlProduct.descriptionHtml || gqlProduct.description || '',
      vendor: gqlProduct.vendor || '',
      product_type: gqlProduct.productType || '',
      tags: gqlProduct.tags.join(', '), // Convert array back to comma-separated string
      variants: (gqlProduct.variants?.nodes || []).map(this.graphqlToLegacyVariant.bind(this)),
      images: this.graphqlMediaToLegacyImages(gqlProduct.media?.nodes || []),
      created_at: gqlProduct.createdAt,
      updated_at: gqlProduct.updatedAt,
    };
  }

  /**
   * Convert GraphQL variant to legacy REST API format
   */
  private graphqlToLegacyVariant(gqlVariant: ShopifyGraphQLVariant): ShopifyVariant {
    return {
      id: parseInt(gqlVariant.legacyResourceId, 10),
      title: gqlVariant.title || 'Default',
      price: gqlVariant.price,
      sku: gqlVariant.sku || '',
      inventory_quantity: gqlVariant.inventoryQuantity || 0,
      available: gqlVariant.availableForSale,
    };
  }

  /**
   * Convert GraphQL media nodes to legacy image format
   * Only includes images (filters out videos and 3D models)
   */
  private graphqlMediaToLegacyImages(mediaNodes: ShopifyGraphQLMedia[]): ShopifyImage[] {
    return mediaNodes
      .filter(media => media.mediaContentType === 'IMAGE' && media.preview?.image?.url)
      .map((media, index) => ({
        id: parseInt(media.id.replace(/\D/g, ''), 10) || index,
        src: media.preview!.image!.url,
        alt: media.alt || '',
        position: index + 1,
      }));
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
   * Verify Shopify store credentials using GraphQL API
   * Uses shop query to verify read access
   */
  async verifyCredentials(shopifyStoreUrl: string, adminAccessToken: string): Promise<boolean> {
    try {
      const baseUrl = this.normalizeStoreUrl(shopifyStoreUrl);
      console.log(`Verifying Shopify credentials for: ${baseUrl} (using GraphQL API ${SHOPIFY_API_VERSION})`);

      const result = await this.graphqlRequest<{ shop: { name: string } }>(
        shopifyStoreUrl,
        adminAccessToken,
        SHOP_QUERY
      );

      if (result.errors && result.errors.length > 0) {
        console.error(`Shopify verification failed: ${result.errors.map(e => e.message).join(', ')}`);
        return false;
      }

      if (result.data?.shop?.name) {
        console.log(`Shopify credentials verified successfully for shop: ${result.data.shop.name}`);
        return true;
      }

      console.error('Shopify verification failed: No shop data returned');
      return false;
    } catch (error) {
      console.error('Shopify verification error:', error);
      return false;
    }
  }
}

export const shopifyService = new ShopifyService();
