import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { MantraClient } from './mantra-client.js';
import { registerAllTools } from './tools/index.js';
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export async function startMCPServer() {
  // Check for the -r flag to use HTTP transport instead of stdio
  const useHttp = process.argv.includes('-r');
  
  const mantraClient = new MantraClient();
  
  // Create MCP server
  const server = new McpServer({
    name: 'MantraChain MCP Server - interact with the blockchain',
    version: '1.0.4',
  });

  // Register all tools and resources
  registerAllTools(server, mantraClient);

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
  
  const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};


  app.get('/sse', async (req: Request, res: Response) => {
    console.log('Received GET request to /sse (deprecated SSE transport)');
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
      delete transports[transport.sessionId];
    });
    await server.connect(transport);
  });


  // Messages endpoint for receiving client JSON-RPC requests
  app.post('/messages', async (req: Request, res: Response) => {
    console.log('Received POST request to /messages');

    // Extract session ID from URL query parameter
    // In the SSE protocol, this is added by the client based on the endpoint event
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      console.error('No session ID provided in request URL');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = transports[sessionId];
    if (!transport) {
      console.error(`No active transport found for session ID: ${sessionId}`);
      res.status(404).send('Session not found');
      return;
    }

    try {
      // Handle the POST message with the transport
      if (transport instanceof SSEServerTransport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).send('Invalid transport type for this endpoint');
      }
    } catch (error) {
      console.error('Error handling request:', error);
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`MCP server listening on port ${PORT}`);
    console.log(`
  ==============================================
  SUPPORTED TRANSPORT OPTIONS:

  1. Http + SSE (Protocol version: 2024-11-05)
    Endpoints: /sse (GET) and /messages (POST)
    Usage:
      - Establish SSE stream with GET to /sse
      - Send requests with POST to /messages?sessionId=<id>
  ==============================================
  `);
  });
}
