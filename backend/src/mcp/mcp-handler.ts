import type { JsonRpcRequest, JsonRpcResponse, JsonRpcError, McpTool } from '../types/index.js';

export type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

export class McpHandler {
  private tools: Map<string, { tool: McpTool; handler: ToolHandler }> = new Map();

  registerTool(tool: McpTool, handler: ToolHandler): void {
    this.tools.set(tool.name, { tool, handler });
  }

  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    // Validate JSON-RPC version
    if (request.jsonrpc !== '2.0') {
      return this.errorResponse(request.id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
    }

    try {
      switch (request.method) {
        case 'tools/list':
          return this.handleToolsList(request);

        case 'tools/call':
          return this.handleToolsCall(request);

        case 'initialize':
          return this.handleInitialize(request);

        case 'ping':
          return this.successResponse(request.id, { status: 'pong' });

        default:
          return this.errorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.errorResponse(request.id, -32000, message);
    }
  }

  private handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    return this.successResponse(request.id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'x402-shopify-mcp',
        version: '1.0.0',
      },
    });
  }

  private handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
    const tools = Array.from(this.tools.values()).map(({ tool }) => tool);
    return this.successResponse(request.id, { tools });
  }

  private async handleToolsCall(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = request.params as { name: string; arguments?: Record<string, unknown> } | undefined;

    if (!params?.name) {
      return this.errorResponse(request.id, -32602, 'Invalid params: tool name is required');
    }

    const toolEntry = this.tools.get(params.name);
    if (!toolEntry) {
      return this.errorResponse(request.id, -32602, `Tool not found: ${params.name}`);
    }

    try {
      const result = await toolEntry.handler(params.arguments || {});
      return this.successResponse(request.id, {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      return this.successResponse(request.id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      });
    }
  }

  private successResponse(id: string | number, result: unknown): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  private errorResponse(id: string | number, code: number, message: string, data?: unknown): JsonRpcResponse {
    const error: JsonRpcError = { code, message };
    if (data !== undefined) {
      error.data = data;
    }

    return {
      jsonrpc: '2.0',
      id,
      error,
    };
  }
}
