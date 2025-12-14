import { describe, it, expect } from 'vitest';
import {
  registerStoreSchema,
  createOrderIntentSchema,
  finalizePaymentSchema,
} from '../middleware/validation.js';

describe('Validation Schemas', () => {
  describe('registerStoreSchema', () => {
    it('should accept valid store registration', () => {
      const validData = {
        shopify_store_url: 'https://test-store.myshopify.com',
        shopify_admin_access_token: 'shpat_test_token',
        description: 'A test store selling cool products',
        agent_metadata: {
          name: 'Test Store',
          category: 'Electronics',
          tags: ['tech', 'gadgets'],
        },
        pay_to_address: '0x' + '1'.repeat(64),
      };

      const result = registerStoreSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Movement address', () => {
      const invalidData = {
        shopify_store_url: 'https://test-store.myshopify.com',
        shopify_admin_access_token: 'shpat_test_token',
        description: 'A test store',
        agent_metadata: { name: 'Test' },
        pay_to_address: '0x123', // Too short
      };

      const result = registerStoreSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid Movement address');
      }
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        shopify_store_url: 'https://test-store.myshopify.com',
      };

      const result = registerStoreSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty store name in agent_metadata', () => {
      const invalidData = {
        shopify_store_url: 'https://test-store.myshopify.com',
        shopify_admin_access_token: 'shpat_test_token',
        description: 'A test store',
        agent_metadata: { name: '' },
        pay_to_address: '0x' + '1'.repeat(64),
      };

      const result = registerStoreSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createOrderIntentSchema', () => {
    it('should accept valid order intent', () => {
      const validData = {
        store_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        items: [
          {
            product_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            variant_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            quantity: 2,
          },
        ],
      };

      const result = createOrderIntentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        store_id: 'not-a-uuid',
        items: [
          {
            product_id: 'also-not-uuid',
            variant_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            quantity: 1,
          },
        ],
      };

      const result = createOrderIntentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty items array', () => {
      const invalidData = {
        store_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        items: [],
      };

      const result = createOrderIntentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const invalidData = {
        store_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        items: [
          {
            product_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            variant_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            quantity: -1,
          },
        ],
      };

      const result = createOrderIntentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('finalizePaymentSchema', () => {
    it('should accept valid finalize payment request', () => {
      const validData = {
        order_intent_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        x_payment_header: 'eyJ4NDAyVmVyc2lvbiI6MX0=', // Base64 encoded
      };

      const result = finalizePaymentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty payment header', () => {
      const invalidData = {
        order_intent_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        x_payment_header: '',
      };

      const result = finalizePaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
