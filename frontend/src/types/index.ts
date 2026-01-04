// Store types
export interface Store {
  id: string;
  shopify_store_url: string;
  description: string;
  agent_metadata: AgentMetadata;
  created_at: string;
}

export interface AgentMetadata {
  name: string;
  category?: string;
  tags?: string[];
  supported_currencies?: string[];
  shipping_regions?: string[];
  custom_fields?: Record<string, unknown>;
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
export type OrderIntentStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

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

export interface PaymentProof {
  transaction_hash: string;
  signature: string;
  verified_at: string;
  facilitator_response?: unknown;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Form types
export interface StoreRegistrationForm {
  storeName: string;
  storeUrl: string;
  description: string;
  adminAccessToken: string;
  payToAddress: string;
}

// Enriched Order type
export interface EnrichedOrder extends OrderIntent {
  store: Store;
  products: Array<{
    item: OrderItem;
    product: Product | null;
  }>;
}
