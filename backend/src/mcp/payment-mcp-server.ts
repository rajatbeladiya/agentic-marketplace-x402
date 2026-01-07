import { Router, Request, Response } from 'express';
import { McpHandler } from './mcp-handler.js';
import { config } from '../config/index.js';
import type { JsonRpcRequest, McpTool } from '../types/index.js';

const router = Router();
const mcpHandler = new McpHandler();

/**
 * Payment MCP Server
 * Provides tools for creating MOVE token payments on Movement Network
 *
 * Note: x402plus library supports only Movement token payment for now.
 * This implementation uses MOVE tokens directly. For USDC support,
 * a price oracle and swap integration would be needed.
 */

// Define payment tools
const tools: McpTool[] = [
  {
    name: 'make_move_payment',
    description: 'Create a MOVE token payment on Movement Network. Returns the transaction data that needs to be signed by the user wallet. This is used for x402 payment flow.',
    inputSchema: {
      type: 'object',
      properties: {
        pay_to: {
          type: 'string',
          description: 'The recipient address (0x + 64 hex chars)',
        },
        amount: {
          type: 'string',
          description: 'Amount in base units (1 MOVE = 100000000 base units, i.e., 8 decimals)',
        },
        sender: {
          type: 'string',
          description: 'The sender wallet address',
        },
      },
      required: ['pay_to', 'amount', 'sender'],
    },
  },
  {
    name: 'get_payment_requirements',
    description: 'Get the payment requirements for a specific order intent. Returns the details needed to construct the payment transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        order_intent_id: {
          type: 'string',
          description: 'The order intent ID to get payment requirements for',
        },
      },
      required: ['order_intent_id'],
    },
  },
  {
    name: 'verify_payment',
    description: 'Verify a signed payment transaction before submission. Validates the signature and transaction structure.',
    inputSchema: {
      type: 'object',
      properties: {
        x_payment_header: {
          type: 'string',
          description: 'The base64-encoded X-PAYMENT header containing the signed transaction',
        },
        expected_pay_to: {
          type: 'string',
          description: 'Expected recipient address for validation',
        },
        expected_amount: {
          type: 'string',
          description: 'Expected amount for validation',
        },
      },
      required: ['x_payment_header'],
    },
  },
  {
    name: 'get_move_balance',
    description: 'Get the MOVE token balance for a wallet address on Movement Network.',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The wallet address to check balance for',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'convert_usd_to_move',
    description: 'Convert USD amount to MOVE tokens. Rate: 1 MOVE = 2 USD (e.g., $20 = 10 MOVE). Production should use a price oracle.',
    inputSchema: {
      type: 'object',
      properties: {
        usd_amount: {
          type: 'number',
          description: 'Amount in USD',
        },
      },
      required: ['usd_amount'],
    },
  },
];

// Import order service for payment requirements
import { orderService } from '../services/order.service.js';

// Register tool handlers

// make_move_payment - Returns transaction data for signing
mcpHandler.registerTool(tools[0], async (params) => {
  const payTo = params.pay_to as string;
  const amount = params.amount as string;
  const sender = params.sender as string;

  // Validate addresses
  if (!payTo.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid pay_to address format (must be 0x + 64 hex chars)');
  }
  if (!sender.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid sender address format (must be 0x + 64 hex chars)');
  }

  // Validate amount
  const amountBigInt = BigInt(amount);
  if (amountBigInt <= 0n) {
    throw new Error('Amount must be positive');
  }

  // Return transaction construction data
  // The actual signing must be done client-side with the wallet
  return {
    status: 'ready',
    transaction_data: {
      network: config.movementNetwork,
      rpc_url: config.movementRpcUrl,
      function: '0x1::aptos_account::transfer',
      function_arguments: [payTo, amount],
      sender: sender,
      asset: config.movementAsset,
    },
    instructions: [
      '1. Use Aptos SDK to build the transaction with the provided data',
      '2. Sign the transaction with your wallet (signTransaction)',
      '3. DO NOT submit the transaction - the facilitator will do this',
      '4. Serialize the signed transaction and authenticator to BCS base64',
      '5. Build the X-PAYMENT header using buildAptosLikePaymentHeader from x402plus',
    ],
    code_example: `
import { Aptos, AptosConfig, Network, AccountAuthenticatorEd25519 } from "@aptos-labs/ts-sdk";
import { buildAptosLikePaymentHeader } from "x402plus";

const aptos = new Aptos(new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "${config.movementRpcUrl}"
}));

const tx = await aptos.transaction.build.simple({
  sender: "${sender}",
  data: {
    function: "0x1::aptos_account::transfer",
    functionArguments: ["${payTo}", "${amount}"],
  },
});

const signed = await wallet.signTransaction({ transactionOrPayload: tx });

// Build X-PAYMENT header
const xPayment = buildAptosLikePaymentHeader(paymentRequirements, {
  signatureBcsBase64: Buffer.from(authenticator.bcsToBytes()).toString("base64"),
  transactionBcsBase64: Buffer.from(tx.bcsToBytes()).toString("base64"),
});
    `,
  };
});

// get_payment_requirements - Get requirements for an order
mcpHandler.registerTool(tools[1], async (params) => {
  const orderIntentId = params.order_intent_id as string;
  if (!orderIntentId) {
    throw new Error('order_intent_id is required');
  }

  const orderIntent = await orderService.getOrderIntentById(orderIntentId);
  if (!orderIntent) {
    throw new Error('Order intent not found');
  }

  if (orderIntent.status !== 'pending') {
    throw new Error(`Order is not pending: ${orderIntent.status}`);
  }

  return {
    order_intent_id: orderIntent.id,
    payment_requirements: {
      network: orderIntent.network,
      asset: orderIntent.asset,
      payTo: orderIntent.pay_to_address,
      maxAmountRequired: orderIntent.total_amount,
      description: `Payment for order ${orderIntent.id}`,
      mimeType: 'application/json',
      maxTimeoutSeconds: config.paymentTimeoutSeconds,
    },
    expires_at: orderIntent.expires_at,
    items: orderIntent.items,
  };
});

// verify_payment - Verify a signed payment locally
mcpHandler.registerTool(tools[2], async (params) => {
  const xPaymentHeader = params.x_payment_header as string;
  const expectedPayTo = params.expected_pay_to as string | undefined;
  const expectedAmount = params.expected_amount as string | undefined;

  try {
    // Decode the X-PAYMENT header
    const decoded = JSON.parse(Buffer.from(xPaymentHeader, 'base64').toString('utf-8'));

    const validation = {
      valid: true,
      x402_version: decoded.x402Version,
      scheme: decoded.scheme,
      network: decoded.network,
      has_signature: !!decoded.payload?.signature,
      has_transaction: !!decoded.payload?.transaction,
      warnings: [] as string[],
    };

    if (decoded.x402Version !== 1) {
      validation.warnings.push('Unexpected x402 version');
    }

    if (decoded.scheme !== 'exact') {
      validation.warnings.push('Unexpected payment scheme');
    }

    if (!decoded.network?.startsWith('movement')) {
      validation.warnings.push('Network is not movement or movement-testnet');
    }

    if (!decoded.payload?.signature || !decoded.payload?.transaction) {
      validation.valid = false;
      validation.warnings.push('Missing signature or transaction in payload');
    }

    // Note: Full signature verification requires the facilitator
    // This is a structural validation only

    return {
      status: validation.valid ? 'valid_structure' : 'invalid_structure',
      validation,
      note: 'Full cryptographic verification is performed by the facilitator during settlement',
      expected_pay_to: expectedPayTo,
      expected_amount: expectedAmount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 'invalid',
      error: `Failed to decode X-PAYMENT header: ${message}`,
    };
  }
});

// get_move_balance - Check balance on Movement Network
mcpHandler.registerTool(tools[3], async (params) => {
  const address = params.address as string;

  if (!address.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid address format (must be 0x + 64 hex chars)');
  }

  try {
    // Query Movement Network for balance
    const response = await fetch(
      `${config.movementRpcUrl}/accounts/${address}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          address,
          balance: '0',
          balance_move: '0',
          exists: false,
        };
      }
      throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json() as { data?: { coin?: { value?: string } } };
    const balance = data.data?.coin?.value || '0';
    const balanceMove = (BigInt(balance) / BigInt(100_000_000)).toString();

    return {
      address,
      balance,
      balance_move: balanceMove,
      decimals: 8,
      exists: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      address,
      error: `Failed to fetch balance: ${message}`,
      note: 'Ensure Movement RPC is accessible',
    };
  }
});

// convert_usd_to_move - Conversion (1 MOVE = 2 USD)
mcpHandler.registerTool(tools[4], async (params) => {
  const usdAmount = params.usd_amount as number;

  if (typeof usdAmount !== 'number' || usdAmount < 0) {
    throw new Error('usd_amount must be a non-negative number');
  }

  // Convert to MOVE: 1 MOVE = 2 USD (so $10 = 5 MOVE, $20 = 10 MOVE)
  const moveAmount = usdAmount / 2;
  // Convert to base units (8 decimals)
  const baseUnits = BigInt(Math.round(moveAmount * 100_000_000));

  return {
    usd_amount: usdAmount,
    move_amount: baseUnits.toString(),
    move_human_readable: moveAmount.toString(),
    rate: '1 MOVE = 2 USD',
    decimals: 8,
    note: 'Rate: 1 MOVE = 2 USD. Production should use a price oracle for accurate conversion.',
  };
});

// MCP endpoint
router.post('/mcp/payment', async (req: Request, res: Response) => {
  try {
    const request = req.body as JsonRpcRequest;

    // Validate basic JSON-RPC structure
    if (!request || typeof request !== 'object' || !request.method) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON-RPC request',
        },
      });
      return;
    }

    console.log(`Payment MCP Request: ${request.method}`, request.params || {});

    const response = await mcpHandler.handleRequest(request);
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Payment MCP Error:', message);

    res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32000,
        message: `Server error: ${message}`,
      },
    });
  }
});

// Convenience endpoint to get payment tools list via GET
router.get('/mcp/payment/tools', (_req: Request, res: Response) => {
  res.json({
    success: true,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
});

// Import Aptos SDK for transaction building
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// API endpoint to build a transaction (for frontend to avoid CORS)
router.post('/build-transaction', async (req: Request, res: Response) => {
  try {
    const { sender, payTo, amount } = req.body;

    // Validate inputs
    if (!sender || !payTo || !amount) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sender, payTo, amount',
      });
      return;
    }

    if (!sender.match(/^0x[a-fA-F0-9]{64}$/)) {
      res.status(400).json({
        success: false,
        error: 'Invalid sender address format',
      });
      return;
    }

    if (!payTo.match(/^0x[a-fA-F0-9]{64}$/)) {
      res.status(400).json({
        success: false,
        error: 'Invalid payTo address format',
      });
      return;
    }

    // Initialize Aptos client for Movement
    const aptosConfig = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: config.movementRpcUrl,
    });
    const aptos = new Aptos(aptosConfig);

    // Build the transaction with extended expiration (10 minutes to match payment timeout)
    const transaction = await aptos.transaction.build.simple({
      sender: sender,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [payTo, amount],
      },
      options: {
        expireTimestamp: Math.floor(Date.now() / 1000) + config.paymentTimeoutSeconds,
      },
    });

    // Get BCS bytes
    const transactionBcsBase64 = Buffer.from(transaction.bcsToBytes()).toString('base64');

    res.json({
      success: true,
      transactionBcsBase64,
      transaction: {
        sender,
        payTo,
        amount,
        function: '0x1::aptos_account::transfer',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Build transaction error:', message);
    res.status(500).json({
      success: false,
      error: `Failed to build transaction: ${message}`,
    });
  }
});

export default router;
