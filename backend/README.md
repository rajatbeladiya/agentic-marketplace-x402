# x402 Shopify Agentic Marketplace Backend

Backend service for agentic shopping using the x402 payment protocol on Movement blockchain. This service enables LLM agents to discover products from Shopify stores and complete purchases using MOVE tokens.

## Features

- **Store Management**: Register and manage Shopify stores
- **Product Sync**: Fetch and normalize products from Shopify Admin API
- **Two-Phase x402 Payment**: Implements the x402 "Payment Required" pattern
- **MCP Server**: JSON-RPC 2.0 endpoints for LLM agent tooling
- **MCP SSE Server**: Server-Sent Events transport for claude.ai web app
- **Payment MCP Server**: Tools for creating and verifying MOVE token payments
- **Order Management**: Track order intents and completed orders

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LLM Agent     │────▶│  Backend API     │────▶│   Supabase      │
│   (MCP Client)  │     │  (Express.js)    │     │   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Shopify Admin    │
                        │ API              │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ x402 Facilitator │
                        │ (Stableyard)     │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Movement Network │
                        │ (Blockchain)     │
                        └──────────────────┘
```

## x402 Payment Flow

### Phase 1: Initiate Checkout
1. Agent calls `POST /api/checkout/initiate` with store_id and items
2. Server creates an order intent and returns 402 Payment Required
3. Response includes payment requirements (payTo, amount, network)

### Phase 2: Finalize Payment
1. Agent signs a MOVE transfer transaction (without submitting)
2. Agent calls `POST /api/checkout/finalize` with order_intent_id and X-PAYMENT header
3. Server verifies payment via x402 facilitator
4. Facilitator submits transaction to Movement blockchain
5. Order is marked as paid

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- Movement wallet (for testing)

### Installation

```bash
cd backend
npm install
```

### Environment Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_store_url TEXT NOT NULL UNIQUE,
  shopify_admin_access_token TEXT NOT NULL,
  description TEXT NOT NULL,
  agent_metadata JSONB NOT NULL DEFAULT '{}',
  pay_to_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[] DEFAULT '{}',
  variants JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, shopify_product_id)
);

-- Order intents table
CREATE TABLE IF NOT EXISTS order_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MOVE',
  pay_to_address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'movement',
  asset TEXT NOT NULL DEFAULT '0x1::aptos_coin::AptosCoin',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  payment_proof JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_order_intents_store_id ON order_intents(store_id);
CREATE INDEX IF NOT EXISTS idx_order_intents_status ON order_intents(status);
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Health
- `GET /api/health` - Health check with service status
- `GET /api/live` - Liveness probe
- `GET /api/ready` - Readiness probe

### Stores
- `POST /api/stores` - Register a new store
- `GET /api/stores` - List all stores
- `GET /api/stores/:id` - Get store details
- `PATCH /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Products
- `POST /api/stores/:storeId/products/sync` - Sync products from Shopify
- `GET /api/stores/:storeId/products` - List products
- `GET /api/stores/:storeId/products/:productId` - Get product details
- `PATCH /api/stores/:storeId/products/:productId/variants` - Update variants
- `GET /api/stores/:storeId/shopify/products` - Fetch directly from Shopify

### Checkout (x402)
- `POST /api/checkout/initiate` - Phase 1: Create order intent (returns 402)
- `POST /api/checkout/finalize` - Phase 2: Verify payment and finalize

### Orders
- `GET /api/stores/:storeId/order-intents` - List order intents
- `GET /api/stores/:storeId/orders` - List paid orders
- `GET /api/orders/:id` - Get enriched order details
- `POST /api/orders/:id/cancel` - Cancel pending order

### MCP Server (Main)
- `POST /api/mcp` - JSON-RPC 2.0 endpoint (stdio/HTTP)
- `GET /api/mcp/tools` - List available tools
- `GET /api/mcp` - SSE endpoint for claude.ai/chatgpt.com web app
- `POST /api/mcp/sse/message` - Message endpoint for SSE transport

**Tools:**
- `list_stores` - List marketplace stores
- `get_store_products` - Get products for a store
- `initiate_checkout` - Start checkout (Phase 1)
- `finalize_checkout` - Complete checkout (Phase 2)
- `get_order_details` - Get order information

**For claude.ai web app users:**
Add this Remote MCP Server URL in Settings:
```
https://agentic-marketplace-x402.onrender.com/api/mcp
```

### MCP Server (Payment)
- `POST /api/mcp/payment` - JSON-RPC 2.0 endpoint
- `GET /api/mcp/payment/tools` - List payment tools

**Tools:**
- `make_move_payment` - Create payment transaction data
- `get_payment_requirements` - Get requirements for an order
- `verify_payment` - Verify signed payment structure
- `get_move_balance` - Check wallet balance
- `convert_usd_to_move` - Convert USD to MOVE

## MCP Usage Example

```json
// List stores
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_stores",
    "arguments": { "limit": 10 }
  }
}

// Get products
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_store_products",
    "arguments": { "store_id": "uuid-here" }
  }
}

// Initiate checkout
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "initiate_checkout",
    "arguments": {
      "store_id": "uuid-here",
      "items": [
        {
          "product_id": "product-uuid",
          "variant_id": "variant-uuid",
          "quantity": 1
        }
      ]
    }
  }
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Manual Testing

### 1. Check Health
```bash
curl http://localhost:4402/api/health
```

### 2. Register a Store
```bash
curl -X POST http://localhost:4402/api/stores \
  -H "Content-Type: application/json" \
  -d '{
    "shopify_store_url": "https://your-store.myshopify.com",
    "shopify_admin_access_token": "shpat_your_token",
    "description": "My awesome store",
    "agent_metadata": {
      "name": "My Store",
      "category": "Electronics"
    },
    "pay_to_address": "0x1234...64_hex_chars"
  }'
```

### 3. List MCP Tools
```bash
curl http://localhost:4402/api/mcp/tools
```

### 4. Call MCP Tool
```bash
curl -X POST http://localhost:4402/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Notes

- **x402plus Library**: Currently supports only MOVE tokens on Movement Network
- **Price Conversion**: Uses simplified 1:1 USD to MOVE rate (use oracle in production)
- **Facilitator**: Uses Stableyard facilitator at `https://facilitator.stableyard.fi`
- **Security**: Store admin tokens are encrypted at rest in Supabase

## License

MIT
