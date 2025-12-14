import { Router, Request, Response, NextFunction } from 'express';
import { storeService } from '../services/store.service.js';
import { shopifyService } from '../services/shopify.service.js';
import {
  validate,
  registerStoreSchema,
  paginationSchema,
  uuidParamSchema,
} from '../middleware/validation.js';
import type { RegisterStoreRequest } from '../types/index.js';

const router = Router();

// Register a new store
router.post(
  '/stores',
  validate(registerStoreSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as RegisterStoreRequest;

      // Verify Shopify credentials
      const isValid = await shopifyService.verifyCredentials(
        data.shopify_store_url,
        data.shopify_admin_access_token
      );

      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid Shopify credentials or store URL',
        });
        return;
      }

      const store = await storeService.registerStore(data);

      console.log(`Store registered: ${store.id} - ${data.shopify_store_url}`);

      res.status(201).json({
        success: true,
        data: storeService.toPublicStore(store),
        message: 'Store registered successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// List all stores (public info only)
router.get(
  '/stores',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, offset, search } = req.query as {
        limit?: string;
        offset?: string;
        search?: string;
      };

      const result = await storeService.listStores({
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        search: search as string | undefined,
        category: req.query.category as string | undefined,
      });

      res.json({
        success: true,
        data: result.stores,
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

// Get a specific store (public info)
router.get(
  '/stores/:id',
  validate(uuidParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.getStoreById(req.params.id);

      if (!store) {
        res.status(404).json({
          success: false,
          error: 'Store not found',
        });
        return;
      }

      res.json({
        success: true,
        data: storeService.toPublicStore(store),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update store (requires store ownership verification in production)
router.patch(
  '/stores/:id',
  validate(uuidParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { description, agent_metadata, pay_to_address } = req.body;

      const store = await storeService.updateStore(req.params.id, {
        description,
        agent_metadata,
        pay_to_address,
      });

      res.json({
        success: true,
        data: storeService.toPublicStore(store),
        message: 'Store updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete store (requires store ownership verification in production)
router.delete(
  '/stores/:id',
  validate(uuidParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await storeService.deleteStore(req.params.id);

      res.json({
        success: true,
        message: 'Store deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
