import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabaseClient, resetMocks, mockSupabaseResponse } from './setup.js';

// Import after mocks are set up
const { storeService } = await import('../services/store.service.js');

describe('StoreService', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('registerStore', () => {
    it('should register a new store successfully', async () => {
      const mockStore = {
        id: 'test-uuid',
        shopify_store_url: 'https://test-store.myshopify.com',
        shopify_admin_access_token: 'shpat_test',
        description: 'Test store',
        agent_metadata: { name: 'Test Store' },
        pay_to_address: '0x' + '1'.repeat(64),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseResponse(mockStore);

      const result = await storeService.registerStore({
        shopify_store_url: 'https://test-store.myshopify.com',
        shopify_admin_access_token: 'shpat_test',
        description: 'Test store',
        agent_metadata: { name: 'Test Store' },
        pay_to_address: '0x' + '1'.repeat(64),
      });

      expect(result).toEqual(mockStore);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should throw error for duplicate store', async () => {
      mockSupabaseResponse(null, { code: '23505', message: 'duplicate key' });

      await expect(
        storeService.registerStore({
          shopify_store_url: 'https://test-store.myshopify.com',
          shopify_admin_access_token: 'shpat_test',
          description: 'Test store',
          agent_metadata: { name: 'Test Store' },
          pay_to_address: '0x' + '1'.repeat(64),
        })
      ).rejects.toThrow('Store with this Shopify URL already exists');
    });
  });

  describe('getStoreById', () => {
    it('should return store when found', async () => {
      const mockStore = {
        id: 'test-uuid',
        shopify_store_url: 'https://test-store.myshopify.com',
        description: 'Test store',
      };

      mockSupabaseResponse(mockStore);

      const result = await storeService.getStoreById('test-uuid');
      expect(result).toEqual(mockStore);
    });

    it('should return null when store not found', async () => {
      mockSupabaseResponse(null, { code: 'PGRST116' });

      const result = await storeService.getStoreById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listStores', () => {
    it('should return paginated list of stores', async () => {
      const mockStores = [
        { id: 'store-1', shopify_store_url: 'https://store1.myshopify.com' },
        { id: 'store-2', shopify_store_url: 'https://store2.myshopify.com' },
      ];

      mockSupabaseClient.range.mockResolvedValue({
        data: mockStores,
        error: null,
        count: 2,
      });

      const result = await storeService.listStores({ limit: 10, offset: 0 });

      expect(result.stores).toEqual(mockStores);
      expect(result.total).toBe(2);
    });
  });

  describe('toPublicStore', () => {
    it('should remove sensitive fields from store', () => {
      const fullStore = {
        id: 'test-uuid',
        shopify_store_url: 'https://test-store.myshopify.com',
        shopify_admin_access_token: 'secret-token',
        description: 'Test store',
        agent_metadata: { name: 'Test Store' },
        pay_to_address: '0x' + '1'.repeat(64),
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const publicStore = storeService.toPublicStore(fullStore);

      expect(publicStore).not.toHaveProperty('shopify_admin_access_token');
      expect(publicStore).not.toHaveProperty('pay_to_address');
      expect(publicStore).not.toHaveProperty('updated_at');
      expect(publicStore).toHaveProperty('id');
      expect(publicStore).toHaveProperty('shopify_store_url');
      expect(publicStore).toHaveProperty('description');
      expect(publicStore).toHaveProperty('agent_metadata');
      expect(publicStore).toHaveProperty('created_at');
    });
  });
});
