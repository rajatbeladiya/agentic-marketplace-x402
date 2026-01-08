import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { storeService } from '../services/store.service.js';

const router = Router();

/**
 * Get current user's profile and associated store
 * Returns user info and their store (if one exists)
 */
router.get(
  '/auth/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.getStoreByUserId(req.user!.id);

      res.json({
        success: true,
        data: {
          user: {
            id: req.user!.id,
            email: req.user!.email,
          },
          store: store ? storeService.toPublicStore(store) : null,
          hasStore: store !== null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
