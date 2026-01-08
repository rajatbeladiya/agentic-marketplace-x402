import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

// Database schema SQL for reference (to be run in Supabase SQL Editor)
export const DATABASE_SCHEMA = `
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
  shipping_address JSONB,
  shopify_order_id TEXT,
  shopify_order_number TEXT,
  shopify_order_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_order_intents_store_id ON order_intents(store_id);
CREATE INDEX IF NOT EXISTS idx_order_intents_status ON order_intents(status);
CREATE INDEX IF NOT EXISTS idx_order_intents_shopify_order_id ON order_intents(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_stores_shopify_url ON stores(shopify_store_url);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_intents_updated_at ON order_intents;
CREATE TRIGGER update_order_intents_updated_at
  BEFORE UPDATE ON order_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_intents ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on stores" ON stores
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on products" ON products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on order_intents" ON order_intents
  FOR ALL USING (true) WITH CHECK (true);
`;

// Helper function to initialize database schema
export async function initializeDatabase(): Promise<void> {
  const supabase = getSupabaseClient();

  // Note: Schema should be created via Supabase SQL Editor
  // This function just verifies connectivity
  const { error } = await supabase.from('stores').select('id').limit(1);

  if (error && error.code === '42P01') {
    console.error('Database tables not found. Please run the schema SQL in Supabase SQL Editor.');
    console.log('Schema SQL available in src/services/supabase.ts DATABASE_SCHEMA constant');
  }
}
