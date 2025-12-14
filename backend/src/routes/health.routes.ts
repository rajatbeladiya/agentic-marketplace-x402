import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabase.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      supabase: 'unknown',
    },
  };

  try {
    // Check Supabase connection
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('stores').select('id').limit(1);

    if (error && error.code !== 'PGRST116') {
      health.services.supabase = 'error';
      health.status = 'degraded';
    } else {
      health.services.supabase = 'ok';
    }
  } catch {
    health.services.supabase = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Liveness probe (simple)
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe (with dependencies)
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('stores').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      throw new Error('Database not ready');
    }

    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
