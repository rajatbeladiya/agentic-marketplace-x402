import type { Store, Product, OrderIntent, ApiResponse, EnrichedOrder, MeResponse } from "@/types";
import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4402/api";

async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { requireAuth?: boolean }
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Add auth header if we have a token
  const token = await getAuthToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// Store APIs
export async function registerStore(storeData: {
  shopify_store_url: string;
  shopify_admin_access_token: string;
  description: string;
  agent_metadata: {
    name: string;
    category?: string;
  };
  pay_to_address: string;
}): Promise<ApiResponse<Store>> {
  return fetchApi<Store>("/stores", {
    method: "POST",
    body: JSON.stringify(storeData),
  });
}

export async function getStores(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<ApiResponse<Store[]>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.search) searchParams.set("search", params.search);

  return fetchApi<Store[]>(`/stores?${searchParams.toString()}`);
}

export async function getStore(storeId: string): Promise<ApiResponse<Store>> {
  return fetchApi<Store>(`/stores/${storeId}`);
}

// Product APIs
export async function syncProducts(storeId: string): Promise<ApiResponse<{ synced: number; errors: string[] }>> {
  return fetchApi<{ synced: number; errors: string[] }>(`/stores/${storeId}/products/sync`, {
    method: "POST",
  });
}

export async function getProducts(
  storeId: string,
  params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }
): Promise<ApiResponse<Product[]>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.search) searchParams.set("search", params.search);

  return fetchApi<Product[]>(`/stores/${storeId}/products?${searchParams.toString()}`);
}

export async function getShopifyProducts(
  storeId: string,
  limit?: number
): Promise<ApiResponse<Product[]>> {
  const params = limit ? `?limit=${limit}` : "";
  return fetchApi<Product[]>(`/stores/${storeId}/shopify/products${params}`);
}

// Order APIs
export async function getOrderIntents(
  storeId: string,
  params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<ApiResponse<OrderIntent[]>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.status) searchParams.set("status", params.status);

  return fetchApi<OrderIntent[]>(`/stores/${storeId}/order-intents?${searchParams.toString()}`);
}

export async function getOrders(
  storeId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<ApiResponse<OrderIntent[]>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  return fetchApi<OrderIntent[]>(`/stores/${storeId}/orders?${searchParams.toString()}`);
}

export async function getOrderDetails(orderId: string): Promise<ApiResponse<EnrichedOrder>> {
  return fetchApi<EnrichedOrder>(`/orders/${orderId}`);
}

// Health check
export async function checkHealth(): Promise<ApiResponse<{ status: string; services: Record<string, string> }>> {
  return fetchApi<{ status: string; services: Record<string, string> }>("/health");
}

// Auth APIs
export async function getMe(): Promise<ApiResponse<MeResponse>> {
  return fetchApi<MeResponse>("/auth/me");
}
