import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Validation schemas
export const registerStoreSchema = z.object({
  shopify_store_url: z.string().min(1, 'Shopify store URL is required'),
  shopify_admin_access_token: z.string().min(1, 'Admin access token is required'),
  description: z.string().min(1, 'Description is required').max(1000),
  agent_metadata: z.object({
    name: z.string().min(1, 'Store name is required'),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    supported_currencies: z.array(z.string()).optional(),
    shipping_regions: z.array(z.string()).optional(),
    custom_fields: z.record(z.unknown()).optional(),
  }),
  pay_to_address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid Movement address format (must be 0x + 64 hex chars)'),
});

export const createOrderIntentSchema = z.object({
  store_id: z.string().uuid('Invalid store ID'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product ID'),
        variant_id: z.string().uuid('Invalid variant ID'),
        quantity: z.number().int().positive('Quantity must be positive'),
      })
    )
    .min(1, 'At least one item is required'),
});

export const finalizePaymentSchema = z.object({
  order_intent_id: z.string().uuid('Invalid order intent ID'),
  x_payment_header: z.string().min(1, 'Payment header is required'),
});

export const updateVariantsSchema = z.object({
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      shopify_variant_id: z.string(),
      title: z.string(),
      price: z.string(),
      currency: z.string(),
      sku: z.string(),
      inventory_quantity: z.number().int(),
      available: z.boolean(),
    })
  ),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().optional(),
});

// UUID parameter schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const storeIdParamSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
});

// Middleware factory
export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors,
      });
      return;
    }

    // Attach validated data to request
    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    } else {
      (req as Request & { validatedParams: T }).validatedParams = result.data;
    }

    next();
  };
}

// Error handler middleware
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err);

  // Handle known error types
  if (err.message.includes('not found')) {
    res.status(404).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err.message.includes('already exists')) {
    res.status(409).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err.message.includes('not available') || err.message.includes('expired')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Default to 500
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
