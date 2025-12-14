import { describe, it, expect, vi } from 'vitest';
import { McpHandler, ToolHandler } from '../mcp/mcp-handler.js';
import type { McpTool } from '../types/index.js';

describe('McpHandler', () => {
  describe('handleRequest', () => {
    it('should return error for invalid JSON-RPC version', async () => {
      const handler = new McpHandler();

      const response = await handler.handleRequest({
        jsonrpc: '1.0' as '2.0',
        id: 1,
        method: 'test',
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32600);
      expect(response.error?.message).toContain('Invalid Request');
    });

    it('should handle initialize method', async () => {
      const handler = new McpHandler();

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      });

      expect(response.result).toBeDefined();
      const result = response.result as { protocolVersion: string; serverInfo: { name: string } };
      expect(result.protocolVersion).toBeDefined();
      expect(result.serverInfo.name).toBe('x402-shopify-mcp');
    });

    it('should handle ping method', async () => {
      const handler = new McpHandler();

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      });

      expect(response.result).toEqual({ status: 'pong' });
    });

    it('should return error for unknown method', async () => {
      const handler = new McpHandler();

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown_method',
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toContain('Method not found');
    });

    it('should list registered tools', async () => {
      const handler = new McpHandler();

      const tool: McpTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
        },
      };

      handler.registerTool(tool, async () => ({ success: true }));

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      });

      expect(response.result).toBeDefined();
      const result = response.result as { tools: McpTool[] };
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('test_tool');
    });

    it('should call a registered tool', async () => {
      const handler = new McpHandler();

      const toolHandler: ToolHandler = vi.fn().mockResolvedValue({ data: 'test result' });
      const tool: McpTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      handler.registerTool(tool, toolHandler);

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { foo: 'bar' },
        },
      });

      expect(toolHandler).toHaveBeenCalledWith({ foo: 'bar' });
      expect(response.result).toBeDefined();
      const result = response.result as { content: Array<{ type: string; text: string }> };
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('test result');
    });

    it('should return error for unknown tool', async () => {
      const handler = new McpHandler();

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
        },
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toContain('Tool not found');
    });

    it('should handle tool execution errors gracefully', async () => {
      const handler = new McpHandler();

      const tool: McpTool = {
        name: 'failing_tool',
        description: 'A tool that fails',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      handler.registerTool(tool, async () => {
        throw new Error('Tool execution failed');
      });

      const response = await handler.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'failing_tool',
        },
      });

      // Tool errors are returned in the result with isError flag
      expect(response.result).toBeDefined();
      const result = response.result as { content: Array<{ text: string }>; isError: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution failed');
    });
  });
});
