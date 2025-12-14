import { getSupabaseClient } from './supabase.js';
import { shopifyService } from './shopify.service.js';
import { storeService } from './store.service.js';
import type { Product, ProductVariant } from '../types/index.js';

export class ProductService {
  private supabase = getSupabaseClient();

  /**
   * Get all products for a store
   */
  async getProductsByStoreId(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      productType?: string;
    }
  ): Promise<{ products: Product[]; total: number }> {
    const { limit = 50, offset = 0, search, productType } = options || {};

    let query = this.supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (productType) {
      query = query.eq('product_type', productType);
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }

    return {
      products: (products || []) as Product[],
      total: count || 0,
    };
  }

  /**
   * Get a single product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    const { data: product, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get product: ${error.message}`);
    }

    return product as Product;
  }

  /**
   * Sync products from Shopify for a store
   */
  async syncProductsFromShopify(storeId: string): Promise<{ synced: number; errors: string[] }> {
    const store = await storeService.getStoreById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    const shopifyProducts = await shopifyService.fetchProducts(
      store.shopify_store_url,
      store.shopify_admin_access_token
    );

    const normalizedProducts = shopifyService.normalizeProducts(shopifyProducts, storeId);

    let synced = 0;
    const errors: string[] = [];

    for (const product of normalizedProducts) {
      try {
        // Upsert product (update if exists, insert if not)
        const { error } = await this.supabase
          .from('products')
          .upsert(
            {
              store_id: product.store_id,
              shopify_product_id: product.shopify_product_id,
              title: product.title,
              description: product.description,
              vendor: product.vendor,
              product_type: product.product_type,
              tags: product.tags,
              variants: product.variants,
              images: product.images,
            },
            {
              onConflict: 'store_id,shopify_product_id',
            }
          );

        if (error) {
          errors.push(`Product ${product.shopify_product_id}: ${error.message}`);
        } else {
          synced++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Product ${product.shopify_product_id}: ${message}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Update product variants for a specific store
   */
  async updateProductVariants(
    storeId: string,
    productId: string,
    variants: ProductVariant[]
  ): Promise<Product> {
    // Verify product belongs to store
    const { data: existing, error: fetchError } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Product not found or does not belong to this store');
    }

    const { data: product, error } = await this.supabase
      .from('products')
      .update({ variants })
      .eq('id', productId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product variants: ${error.message}`);
    }

    return product as Product;
  }

  /**
   * Get products by their IDs
   */
  async getProductsByIds(productIds: string[]): Promise<Product[]> {
    if (productIds.length === 0) return [];

    const { data: products, error } = await this.supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }

    return (products || []) as Product[];
  }

  /**
   * Delete a product
   */
  async deleteProduct(storeId: string, productId: string): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('store_id', storeId);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }
}

export const productService = new ProductService();
