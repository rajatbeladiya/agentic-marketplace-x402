#!/usr/bin/env node
/**
 * MCP stdio server wrapper for x402 Shopify Marketplace
 * This translates stdio MCP protocol to HTTP calls to the backend
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BACKEND_URL = process.env.X402_BACKEND_URL || 'http://localhost:4402';

// Tool definitions
const tools = [
  {
    name: 'list_stores',
    description: 'List all available stores in the marketplace. Returns store info including name, description, and categories.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of stores to return (default: 50, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 0)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter stores by name or description',
        },
        category: {
          type: 'string',
          description: 'Filter stores by category',
        },
      },
    },
  },
  {
    name: 'get_store_products',
    description: 'Get all products available in a specific store. Returns product details including variants, prices, and availability.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        store_id: {
          type: 'string',
          description: 'The unique identifier of the store (UUID)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of products to return (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 0)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter products by title or description',
        },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'initiate_checkout',
    description: 'Start the checkout process for selected items. Returns payment requirements including amount, recipient address, and order intent ID. This is Phase 1 of the x402 payment flow.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        store_id: {
          type: 'string',
          description: 'The store ID to purchase from (UUID)',
        },
        items: {
          type: 'array',
          description: 'Array of items to purchase',
          items: {
            type: 'object',
            properties: {
              product_id: {
                type: 'string',
                description: 'Product ID (UUID)',
              },
              variant_id: {
                type: 'string',
                description: 'Variant ID (UUID)',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to purchase',
              },
            },
            required: ['product_id', 'variant_id', 'quantity'],
          },
        },
      },
      required: ['store_id', 'items'],
    },
  },
  {
    name: 'finalize_checkout',
    description: 'Complete the checkout by providing the signed payment. This is Phase 2 of the x402 payment flow. Requires the X-PAYMENT header from a signed Movement transaction.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        order_intent_id: {
          type: 'string',
          description: 'The order intent ID from initiate_checkout (UUID)',
        },
        x_payment_header: {
          type: 'string',
          description: 'The base64-encoded X-PAYMENT header containing the signed transaction',
        },
      },
      required: ['order_intent_id', 'x_payment_header'],
    },
  },
  {
    name: 'get_order_details',
    description: 'Get detailed information about an order including store info, product details, and payment status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'The order ID to retrieve (UUID)',
        },
      },
      required: ['order_id'],
    },
  },
];

async function callBackend(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${BACKEND_URL}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { result?: { content?: unknown[] }; error?: { message: string } };

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.result?.content?.[0] || result.result;
}

async function main() {
  const server = new Server(
    {
      name: 'x402-shopify-marketplace',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await callBackend(name, args || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
