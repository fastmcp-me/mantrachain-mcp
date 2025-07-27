import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MantraClient } from './mantra-client.js';
import { registerAllTools, registerAllPrompts } from './tools/index.js';
import express, { Request, Response } from 'express';
// import { randomUUID } from 'node:crypto';
import cors from 'cors';

export async function startMCPServer() {
  // Check for the --http/-h flag to use HTTP transport instead of stdio
  const useHttp = process.argv.includes('--http') || process.argv.includes('-h');

  const mantraClient = new MantraClient();
  
  // Create MCP server
  const server = new McpServer({
    name: 'MantraChain MCP Server - interact with the blockchain',
    version: '1.0.4',
  });

  // Register all tools and resources
  registerAllTools(server, mantraClient);
  // Register Prompts
  registerAllPrompts(server);

  if (useHttp) {
    // Use Streamable HTTP transport
    await startWithHttp(server);
  } else {
    // Use stdio transport (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

async function startWithHttp(server: McpServer) {
  const app = express();
  app.use(express.json());
  // Configure CORS to expose Mcp-Session-Id header for browser-based clients
  app.use(cors({
    origin: '*', // Allow all origins - adjust as needed for production
    exposedHeaders: ['Mcp-Session-Id']
  }));


  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        console.log('Request closed');
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    }));
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    }));
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, (error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    process.exit(0);
  });
}
