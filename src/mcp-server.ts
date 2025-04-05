import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MantraClient } from './mantra-client.js';
import { registerAllTools } from './tools/index.js';

export async function startMCPServer() {
  const mantraClient = new MantraClient();
  
  // Create MCP server
  const server = new McpServer({
    name: 'MantraChain MCP Server - interact with the blockchain',
    version: '1.0.2',
  });

  // Register all tools and resources
  registerAllTools(server, mantraClient);

  // Connect server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
