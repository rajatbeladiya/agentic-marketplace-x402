-- x402 Shopify Marketplace Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_store_url TEXT NOT NULL,
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
  tags JSONB NOT NULL DEFAULT '[]',
  variants JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  asset TEXT NOT NULL DEFAULT 'MOVE',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  payment_proof JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_shopify_product_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_order_intents_store_id ON order_intents(store_id);
CREATE INDEX IF NOT EXISTS idx_order_intents_status ON order_intents(status);
CREATE INDEX IF NOT EXISTS idx_stores_shopify_store_url ON stores(shopify_store_url);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
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

-- Enable Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_intents ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role has full access to stores" ON stores
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to products" ON products
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to order_intents" ON order_intents
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to authenticated and service roles
GRANT ALL ON stores TO authenticated;
GRANT ALL ON stores TO service_role;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;
GRANT ALL ON order_intents TO authenticated;
GRANT ALL ON order_intents TO service_role;

-- =====================================================
-- AUTH MIGRATION: Link stores to Supabase Auth users
-- Run this after the initial schema is set up
-- =====================================================

-- Add user_id column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);

-- Add unique constraint: one user can only have one store
-- Note: This allows NULL user_id for existing stores without users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_store'
    ) THEN
        ALTER TABLE stores ADD CONSTRAINT unique_user_store UNIQUE (user_id);
    END IF;
END $$;

-- Add unique constraint on shopify_store_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_shopify_store_url'
    ) THEN
        ALTER TABLE stores ADD CONSTRAINT unique_shopify_store_url UNIQUE (shopify_store_url);
    END IF;
END $$;

-- =====================================================
-- SHIPPING ADDRESS MIGRATION
-- Add shipping_address column to order_intents
-- =====================================================

-- Add shipping_address column to order_intents table
ALTER TABLE order_intents ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- =====================================================
-- SHOPIFY ORDER TRACKING MIGRATION
-- Add Shopify order ID columns to order_intents
-- =====================================================

-- Add Shopify order tracking columns
ALTER TABLE order_intents ADD COLUMN IF NOT EXISTS shopify_order_id TEXT;
ALTER TABLE order_intents ADD COLUMN IF NOT EXISTS shopify_order_number TEXT;
ALTER TABLE order_intents ADD COLUMN IF NOT EXISTS shopify_order_name TEXT;

-- Create index for Shopify order lookups
CREATE INDEX IF NOT EXISTS idx_order_intents_shopify_order_id ON order_intents(shopify_order_id);
