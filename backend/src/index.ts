import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { config, validateConfig } from './config/index.js';
import { errorHandler } from './middleware/validation.js';
import { initializeDatabase } from './services/supabase.js';

// Routes
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import storeRoutes from './routes/store.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';

// MCP Servers
import mainMcpServer from './mcp/main-mcp-server.js';
import paymentMcpServer from './mcp/payment-mcp-server.js';
import sseMcpServer from './mcp/sse-server.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    exposedHeaders: ['X-PAYMENT-RESPONSE'],
  })
);
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', storeRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);

// MCP Servers (JSON-RPC 2.0)
app.use('/api', mainMcpServer);
app.use('/api', paymentMcpServer);
app.use('/api', sseMcpServer); // SSE transport for claude.ai

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'x402 Shopify Agentic Marketplace Backend',
    version: '1.0.0',
    description: 'Backend for agentic shopping with x402 payment protocol on Movement blockchain',
    endpoints: {
      health: '/api/health',
      stores: '/api/stores',
      products: '/api/stores/:storeId/products',
      checkout: {
        initiate: 'POST /api/checkout/initiate',
        finalize: 'POST /api/checkout/finalize',
      },
      orders: '/api/orders/:id',
      mcp: {
        main: 'POST /api/mcp',
        mainTools: 'GET /api/mcp/tools',
        payment: 'POST /api/mcp/payment',
        paymentTools: 'GET /api/mcp/payment/tools',
        sse: 'GET /api/mcp/sse (for claude.ai)',
      },
    },
    documentation: {
      x402Protocol: 'https://github.com/coinbase/x402',
      movementNetwork: 'https://movementlabs.xyz',
    },
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
async function start() {
  try {
    // Validate configuration
    validateConfig();
    console.log('Configuration validated');

    // Initialize database connection
    await initializeDatabase();
    console.log('Database connection initialized');

    // Start listening
    app.listen(config.port, () => {
      console.log(`\n========================================`);
      console.log(`x402 Shopify Backend Server`);
      console.log(`========================================`);
      console.log(`Server running at http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`\nEndpoints:`);
      console.log(`  Health:   GET  /api/health`);
      console.log(`  Stores:   GET  /api/stores`);
      console.log(`  Products: GET  /api/stores/:id/products`);
      console.log(`  Checkout: POST /api/checkout/initiate`);
      console.log(`            POST /api/checkout/finalize`);
      console.log(`  MCP:      POST /api/mcp`);
      console.log(`  Payment:  POST /api/mcp/payment`);
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app };
