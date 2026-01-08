// Store types
export interface Store {
  id: string;
  user_id?: string; // Links store to Supabase Auth user
  shopify_store_url: string;
  shopify_admin_access_token: string;
  description: string;
  agent_metadata: AgentMetadata;
  pay_to_address: string;
  created_at: string;
  updated_at: string;
}

export interface AgentMetadata {
  name: string;
  category?: string;
  tags?: string[];
  supported_currencies?: string[];
  shipping_regions?: string[];
  custom_fields?: Record<string, unknown>;
}

export interface StorePublic {
  id: string;
  shopify_store_url: string;
  description: string;
  agent_metadata: AgentMetadata;
  created_at: string;
}

// Product types
export interface Product {
  id: string;
  store_id: string;
  shopify_product_id: string;
  title: string;
  description: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ProductVariant[];
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  shopify_variant_id: string;
  title: string;
  price: string;
  currency: string;
  sku: string;
  inventory_quantity: number;
  available: boolean;
}

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
  position: number;
}

// Order types
export type OrderIntentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export interface OrderIntent {
  id: string;
  store_id: string;
  items: OrderItem[];
  total_amount: string;
  currency: string;
  pay_to_address: string;
  network: string;
  asset: string;
  status: OrderIntentStatus;
  payment_proof?: PaymentProof;
  shipping_address?: ShippingAddress;
  shopify_order_id?: string;
  shopify_order_number?: string;
  shopify_order_name?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  price: string;
  title: string;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
  email?: string;
}

export interface PaymentProof {
  transaction: string;
  signature: string;
  verified_at: string;
  facilitator_response?: unknown;
}

// Payment types for x402
export interface PaymentRequirements {
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  orderIntentId: string;
}

export interface X402PaymentHeader {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    transaction: string;
  };
}

// API Request/Response types
export interface RegisterStoreRequest {
  shopify_store_url: string;
  shopify_admin_access_token: string;
  description: string;
  agent_metadata: AgentMetadata;
  pay_to_address: string;
}

export interface CreateOrderIntentRequest {
  store_id: string;
  items: Array<{
    product_id: string;
    variant_id: string;
    quantity: number;
  }>;
  shipping_address?: ShippingAddress;
}

export interface FinalizePaymentRequest {
  order_intent_id: string;
  x_payment_header: string;
}

// MCP JSON-RPC types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Tool types
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Shopify API types (REST - legacy)
export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string;
  inventory_quantity: number;
  available: boolean;
}

export interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
  position: number;
}

// Shopify GraphQL API types (2026-01)
export interface ShopifyGraphQLProduct {
  id: string; // GraphQL uses global IDs like "gid://shopify/Product/123"
  legacyResourceId: string; // The numeric ID for backward compatibility
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  variants: {
    nodes: ShopifyGraphQLVariant[];
  };
  media: {
    nodes: ShopifyGraphQLMedia[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyGraphQLVariant {
  id: string;
  legacyResourceId: string;
  title: string;
  price: string;
  sku: string | null;
  inventoryQuantity: number | null;
  availableForSale: boolean;
}

export interface ShopifyGraphQLMedia {
  id: string;
  alt: string | null;
  mediaContentType: string;
  preview?: {
    image?: {
      url: string;
    };
  };
}

export interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface ShopifyProductsQueryResponse {
  products: {
    nodes: ShopifyGraphQLProduct[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export interface ShopifyProductQueryResponse {
  product: ShopifyGraphQLProduct | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Enriched Order type
export interface EnrichedOrder extends OrderIntent {
  store: StorePublic;
  products: Array<{
    item: OrderItem;
    product: Product | null;
  }>;
}
