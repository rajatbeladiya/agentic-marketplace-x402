import { Router, Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service.js';
import {
  validate,
  createOrderIntentSchema,
  finalizePaymentSchema,
  storeIdParamSchema,
  uuidParamSchema,
  paginationSchema,
} from '../middleware/validation.js';

const router = Router();

/**
 * Phase 1: Create order intent
 * Returns 402 Payment Required with payment requirements
 */
router.post(
  '/checkout/initiate',
  validate(createOrderIntentSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderIntent, paymentRequirements } = await orderService.createOrderIntent(req.body);

      console.log(`Order intent created: ${orderIntent.id} for store ${orderIntent.store_id}`);

      // Return 402 Payment Required with payment requirements
      res.status(402).json({
        success: true,
        message: 'Payment required',
        orderIntent: {
          id: orderIntent.id,
          total_amount: orderIntent.total_amount,
          currency: orderIntent.currency,
          expires_at: orderIntent.expires_at,
          items: orderIntent.items,
        },
        accepts: [paymentRequirements],
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Phase 2: Finalize payment
 * Verifies X-PAYMENT header and finalizes order
 */
router.post(
  '/checkout/finalize',
  validate(finalizePaymentSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { order_intent_id, x_payment_header } = req.body;

      const orderIntent = await orderService.finalizeOrder(order_intent_id, x_payment_header);

      console.log(`Order finalized: ${orderIntent.id} - Status: ${orderIntent.status}`);

      res.json({
        success: true,
        message: 'Payment verified and order finalized',
        data: orderIntent,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get all order intents for a store
router.get(
  '/stores/:storeId/order-intents',
  validate(storeIdParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { limit, offset } = req.query as { limit?: string; offset?: string };
      const status = req.query.status as string | undefined;

      const result = await orderService.getOrderIntentsByStoreId(storeId, {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        status,
      });

      res.json({
        success: true,
        data: result.orderIntents,
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

// Get all paid orders for a store
router.get(
  '/stores/:storeId/orders',
  validate(storeIdParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { limit, offset } = req.query as { limit?: string; offset?: string };

      const result = await orderService.getOrdersByStoreId(storeId, {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      res.json({
        success: true,
        data: result.orders,
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

// Get enriched order details
router.get(
  '/orders/:id',
  validate(uuidParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrichedOrder = await orderService.getEnrichedOrder(req.params.id);

      if (!enrichedOrder) {
        res.status(404).json({
          success: false,
          error: 'Order not found',
        });
        return;
      }

      res.json({
        success: true,
        data: enrichedOrder,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Cancel an order intent
router.post(
  '/orders/:id/cancel',
  validate(uuidParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderIntent = await orderService.cancelOrderIntent(req.params.id);

      res.json({
        success: true,
        data: orderIntent,
        message: 'Order cancelled successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
