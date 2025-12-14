import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service.js';
import { shopifyService } from '../services/shopify.service.js';
import { storeService } from '../services/store.service.js';
import {
  validate,
  storeIdParamSchema,
  paginationSchema,
  updateVariantsSchema,
} from '../middleware/validation.js';

const router = Router();

// Fetch and sync products from Shopify for a store
router.post(
  '/stores/:storeId/products/sync',
  validate(storeIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;

      console.log(`Starting product sync for store: ${storeId}`);
      const result = await productService.syncProductsFromShopify(storeId);

      res.json({
        success: true,
        data: {
          synced: result.synced,
          errors: result.errors,
        },
        message: `Synced ${result.synced} products`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Fetch products directly from Shopify (without storing)
router.get(
  '/stores/:storeId/shopify/products',
  validate(storeIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { limit } = req.query;

      const store = await storeService.getStoreById(storeId);
      if (!store) {
        res.status(404).json({
          success: false,
          error: 'Store not found',
        });
        return;
      }

      const shopifyProducts = await shopifyService.fetchProducts(
        store.shopify_store_url,
        store.shopify_admin_access_token,
        { limit: limit ? parseInt(limit as string, 10) : 50 }
      );

      const normalizedProducts = shopifyService.normalizeProducts(shopifyProducts, storeId);

      res.json({
        success: true,
        data: normalizedProducts,
        count: normalizedProducts.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

// List products for a store (from database)
router.get(
  '/stores/:storeId/products',
  validate(storeIdParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { limit, offset, search } = req.query as {
        limit?: string;
        offset?: string;
        search?: string;
      };

      const result = await productService.getProductsByStoreId(storeId, {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        search: search as string | undefined,
        productType: req.query.productType as string | undefined,
      });

      res.json({
        success: true,
        data: result.products,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get a single product
router.get(
  '/stores/:storeId/products/:productId',
  validate(storeIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      const product = await productService.getProductById(productId);

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
        return;
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update product variants
router.patch(
  '/stores/:storeId/products/:productId/variants',
  validate(storeIdParamSchema, 'params'),
  validate(updateVariantsSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, productId } = req.params;
      const { variants } = req.body;

      const product = await productService.updateProductVariants(storeId, productId, variants);

      res.json({
        success: true,
        data: product,
        message: 'Product variants updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete a product
router.delete(
  '/stores/:storeId/products/:productId',
  validate(storeIdParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, productId } = req.params;

      await productService.deleteProduct(storeId, productId);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
