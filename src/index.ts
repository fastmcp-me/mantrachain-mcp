#!/usr/bin/env node
import { startMCPServer } from './mcp-server.js';

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start MCP Server
startMCPServer().catch((error) => {
  console.error('Failed to start MCP Server:', error);
  process.exit(1);
});
