import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock('../services/supabase.js', () => ({
  getSupabaseClient: () => mockSupabaseClient,
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
  DATABASE_SCHEMA: '',
}));

// Mock config
vi.mock('../config/index.js', () => ({
  config: {
    port: 4402,
    nodeEnv: 'test',
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceRoleKey: 'test-key',
    supabaseAnonKey: 'test-anon-key',
    movementRpcUrl: 'https://mainnet.movementnetwork.xyz/v1',
    movementNetwork: 'movement',
    movementAsset: '0x1::aptos_coin::AptosCoin',
    facilitatorUrl: 'https://facilitator.stableyard.fi',
    paymentTimeoutSeconds: 600,
    orderIntentExpiryMinutes: 30,
    corsOrigin: '*',
  },
  validateConfig: vi.fn(),
}));

// Reset mocks between tests
export function resetMocks() {
  vi.clearAllMocks();
  mockSupabaseClient.single.mockReset();
}

// Helper to mock Supabase responses
export function mockSupabaseResponse(data: unknown, error: unknown = null, count?: number) {
  mockSupabaseClient.single.mockResolvedValue({ data, error });
  // For queries that return multiple results
  if (count !== undefined) {
    mockSupabaseClient.range.mockResolvedValue({ data, error, count });
  } else {
    mockSupabaseClient.range.mockReturnThis();
  }
}
