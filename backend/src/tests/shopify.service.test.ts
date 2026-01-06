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
    it('should fetch products from Shopify GraphQL API', async () => {
      // GraphQL response format
      const mockGraphQLResponse = {
        data: {
          products: {
            nodes: [
              {
                id: 'gid://shopify/Product/1',
                legacyResourceId: '1',
                title: 'Product 1',
                description: 'Description 1',
                descriptionHtml: '<p>Description 1</p>',
                vendor: 'Vendor 1',
                productType: 'Type 1',
                tags: ['tag1'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                variants: { nodes: [] },
                media: { nodes: [] },
              },
              {
                id: 'gid://shopify/Product/2',
                legacyResourceId: '2',
                title: 'Product 2',
                description: 'Description 2',
                descriptionHtml: '<p>Description 2</p>',
                vendor: 'Vendor 2',
                productType: 'Type 2',
                tags: ['tag2'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                variants: { nodes: [] },
                media: { nodes: [] },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGraphQLResponse),
      });

      const result = await shopifyService.fetchProducts(
        'https://test-store.myshopify.com',
        'test-token'
      );

      // Should return converted legacy format products
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('Product 1');
      expect(result[1].id).toBe(2);
      expect(result[1].title).toBe('Product 2');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-store.myshopify.com/admin/api/2026-01/graphql.json'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle Shopify GraphQL API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        shopifyService.fetchProducts('https://test-store.myshopify.com', 'invalid-token')
      ).rejects.toThrow('Shopify GraphQL API error (401): Unauthorized');
    });

    it('should handle GraphQL errors in response', async () => {
      const mockErrorResponse = {
        data: null,
        errors: [
          { message: 'Access denied' },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse),
      });

      await expect(
        shopifyService.fetchProducts('https://test-store.myshopify.com', 'invalid-token')
      ).rejects.toThrow('Shopify GraphQL error: Access denied');
    });
  });

  describe('verifyCredentials', () => {
    it('should return true for valid credentials', async () => {
      // GraphQL response format for shop query
      const mockGraphQLResponse = {
        data: {
          shop: {
            name: 'Test Store',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGraphQLResponse),
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
        text: () => Promise.resolve('Unauthorized'),
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

    it('should return false when shop data is missing', async () => {
      const mockGraphQLResponse = {
        data: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGraphQLResponse),
      });

      const result = await shopifyService.verifyCredentials(
        'https://test-store.myshopify.com',
        'token'
      );

      expect(result).toBe(false);
    });
  });

  describe('fetchProduct', () => {
    it('should fetch a single product by ID', async () => {
      const mockGraphQLResponse = {
        data: {
          product: {
            id: 'gid://shopify/Product/12345',
            legacyResourceId: '12345',
            title: 'Single Product',
            description: 'Test description',
            descriptionHtml: '<p>Test description</p>',
            vendor: 'Test Vendor',
            productType: 'Test Type',
            tags: ['tag1', 'tag2'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            variants: {
              nodes: [
                {
                  id: 'gid://shopify/ProductVariant/67890',
                  legacyResourceId: '67890',
                  title: 'Default',
                  price: '29.99',
                  sku: 'TEST-SKU',
                  inventoryQuantity: 5,
                  availableForSale: true,
                },
              ],
            },
            media: {
              nodes: [
                {
                  id: 'gid://shopify/MediaImage/111',
                  alt: 'Product image',
                  mediaContentType: 'IMAGE',
                  preview: {
                    image: {
                      url: 'https://example.com/image.jpg',
                    },
                  },
                },
              ],
            },
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGraphQLResponse),
      });

      const result = await shopifyService.fetchProduct(
        'https://test-store.myshopify.com',
        'test-token',
        '12345'
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(12345);
      expect(result!.title).toBe('Single Product');
      expect(result!.variants).toHaveLength(1);
      expect(result!.variants[0].id).toBe(67890);
      expect(result!.images).toHaveLength(1);
      expect(result!.images[0].src).toBe('https://example.com/image.jpg');
    });

    it('should return null for non-existent product', async () => {
      const mockGraphQLResponse = {
        data: {
          product: null,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGraphQLResponse),
      });

      const result = await shopifyService.fetchProduct(
        'https://test-store.myshopify.com',
        'test-token',
        '99999'
      );

      expect(result).toBeNull();
    });
  });
});
