import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shopifyService } from '../services/shopify.service.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ShopifyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeProduct', () => {
    it('should normalize a Shopify product correctly', () => {
      const shopifyProduct = {
        id: 12345,
        title: 'Test Product',
        body_html: '<p>This is a <strong>test</strong> description</p>',
        vendor: 'Test Vendor',
        product_type: 'Electronics',
        tags: 'tag1, tag2, tag3',
        variants: [
          {
            id: 67890,
            title: 'Small',
            price: '19.99',
            sku: 'TEST-SKU-S',
            inventory_quantity: 10,
            available: true,
          },
        ],
        images: [
          {
            id: 111,
            src: 'https://example.com/image.jpg',
            alt: 'Product image',
            position: 1,
          },
        ],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const normalized = shopifyService.normalizeProduct(shopifyProduct, 'store-uuid');

      expect(normalized.store_id).toBe('store-uuid');
      expect(normalized.shopify_product_id).toBe('12345');
      expect(normalized.title).toBe('Test Product');
      expect(normalized.description).toBe('This is a test description');
      expect(normalized.vendor).toBe('Test Vendor');
      expect(normalized.product_type).toBe('Electronics');
      expect(normalized.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(normalized.variants).toHaveLength(1);
      expect(normalized.variants[0].shopify_variant_id).toBe('67890');
      expect(normalized.variants[0].price).toBe('19.99');
      expect(normalized.images).toHaveLength(1);
      expect(normalized.images[0].src).toBe('https://example.com/image.jpg');
    });

    it('should handle empty tags and missing fields', () => {
      const shopifyProduct = {
        id: 12345,
        title: 'Minimal Product',
        body_html: '',
        vendor: '',
        product_type: '',
        tags: '',
        variants: [],
        images: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const normalized = shopifyService.normalizeProduct(shopifyProduct, 'store-uuid');

      expect(normalized.tags).toEqual([]);
      expect(normalized.variants).toEqual([]);
      expect(normalized.images).toEqual([]);
      expect(normalized.description).toBe('');
    });
  });

  describe('fetchProducts', () => {
    it('should fetch products from Shopify API', async () => {
      const mockProducts = {
        products: [
          { id: 1, title: 'Product 1' },
          { id: 2, title: 'Product 2' },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      const result = await shopifyService.fetchProducts(
        'https://test-store.myshopify.com',
        'test-token'
      );

      expect(result).toEqual(mockProducts.products);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-store.myshopify.com/admin/api/2024-01/products.json'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle Shopify API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        shopifyService.fetchProducts('https://test-store.myshopify.com', 'invalid-token')
      ).rejects.toThrow('Shopify API error (401): Unauthorized');
    });
  });

  describe('verifyCredentials', () => {
    it('should return true for valid credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ shop: { name: 'Test Store' } }),
      });

      const result = await shopifyService.verifyCredentials(
        'https://test-store.myshopify.com',
        'valid-token'
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await shopifyService.verifyCredentials(
        'https://test-store.myshopify.com',
        'invalid-token'
      );

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await shopifyService.verifyCredentials(
        'https://test-store.myshopify.com',
        'token'
      );

      expect(result).toBe(false);
    });
  });
});
