import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4402', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Test Mode - when true, uses mock Shopify data
  testMode: process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'development',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',

  // Movement Network
  movementRpcUrl: process.env.MOVEMENT_RPC_URL || 'https://mainnet.movementnetwork.xyz/v1',
  movementNetwork: process.env.MOVEMENT_NETWORK || 'movement',
  movementAsset: process.env.MOVEMENT_ASSET || '0x1::aptos_coin::AptosCoin',

  // x402 Facilitator
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stableyard.fi',

  // Payment defaults
  paymentTimeoutSeconds: parseInt(process.env.PAYMENT_TIMEOUT_SECONDS || '600', 10),
  orderIntentExpiryMinutes: parseInt(process.env.ORDER_INTENT_EXPIRY_MINUTES || '30', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Skip payment verification in test mode
  skipPaymentVerification: process.env.SKIP_PAYMENT_VERIFICATION === 'true',
} as const;

export function validateConfig(): void {
  const required = ['supabaseUrl', 'supabaseServiceRoleKey'] as const;
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
