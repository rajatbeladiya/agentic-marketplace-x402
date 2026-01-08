import { getSupabaseClient } from './supabase.js';
import type { Store, StorePublic, RegisterStoreRequest, AgentMetadata } from '../types/index.js';

export class StoreService {
  private supabase = getSupabaseClient();

  /**
   * Register a new store linked to an authenticated user
   */
  async registerStoreWithUser(data: RegisterStoreRequest, userId: string): Promise<Store> {
    // Check if user already has a store
    const existingStore = await this.getStoreByUserId(userId);
    if (existingStore) {
      throw new Error('User already has a registered store');
    }

    const { data: store, error } = await this.supabase
      .from('stores')
      .insert({
        shopify_store_url: data.shopify_store_url,
        shopify_admin_access_token: data.shopify_admin_access_token,
        description: data.description,
        agent_metadata: data.agent_metadata,
        pay_to_address: data.pay_to_address,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('user_id') || error.message.includes('unique_user_store')) {
          throw new Error('User already has a registered store');
        }
        throw new Error('Store with this Shopify URL already exists');
      }
      throw new Error(`Failed to register store: ${error.message}`);
    }

    return store as Store;
  }

  /**
   * Get store by user ID
   */
  async getStoreByUserId(userId: string): Promise<Store | null> {
    const { data: store, error } = await this.supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No store found for this user
      }
      throw new Error(`Failed to get store: ${error.message}`);
    }

    return store as Store;
  }

  /**
   * Legacy: Register a store without user linking (for backwards compatibility)
   * @deprecated Use registerStoreWithUser instead
   */
  async registerStore(data: RegisterStoreRequest): Promise<Store> {
    const { data: store, error } = await this.supabase
      .from('stores')
      .insert({
        shopify_store_url: data.shopify_store_url,
        shopify_admin_access_token: data.shopify_admin_access_token,
        description: data.description,
        agent_metadata: data.agent_metadata,
        pay_to_address: data.pay_to_address,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Store with this Shopify URL already exists');
      }
      throw new Error(`Failed to register store: ${error.message}`);
    }

    return store as Store;
  }

  async getStoreById(storeId: string): Promise<Store | null> {
    const { data: store, error } = await this.supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get store: ${error.message}`);
    }

    return store as Store;
  }

  async getStoreByUrl(shopifyUrl: string): Promise<Store | null> {
    const { data: store, error } = await this.supabase
      .from('stores')
      .select('*')
      .eq('shopify_store_url', shopifyUrl)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get store: ${error.message}`);
    }

    return store as Store;
  }

  async listStores(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    category?: string;
  }): Promise<{ stores: StorePublic[]; total: number }> {
    const { limit = 50, offset = 0, search, category } = options || {};

    let query = this.supabase
      .from('stores')
      .select('id, shopify_store_url, description, agent_metadata, created_at', { count: 'exact' });

    if (search) {
      query = query.or(`description.ilike.%${search}%,shopify_store_url.ilike.%${search}%`);
    }

    if (category) {
      query = query.filter('agent_metadata->>category', 'eq', category);
    }

    const { data: stores, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list stores: ${error.message}`);
    }

    return {
      stores: (stores || []) as StorePublic[],
      total: count || 0,
    };
  }

  async updateStore(
    storeId: string,
    updates: Partial<{
      description: string;
      agent_metadata: AgentMetadata;
      pay_to_address: string;
    }>
  ): Promise<Store> {
    const { data: store, error } = await this.supabase
      .from('stores')
      .update(updates)
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update store: ${error.message}`);
    }

    return store as Store;
  }

  async deleteStore(storeId: string): Promise<void> {
    const { error } = await this.supabase.from('stores').delete().eq('id', storeId);

    if (error) {
      throw new Error(`Failed to delete store: ${error.message}`);
    }
  }

  // Convert full store to public store (without sensitive fields)
  toPublicStore(store: Store): StorePublic {
    return {
      id: store.id,
      shopify_store_url: store.shopify_store_url,
      description: store.description,
      agent_metadata: store.agent_metadata,
      created_at: store.created_at,
    };
  }
}

export const storeService = new StoreService();
