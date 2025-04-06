import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';
import { convertBigIntToString } from '../utils.js';

export function registerDexTools(server: McpServer, mantraClient: MantraClient) {
  // Get all DEX pools
  server.tool(
    "dex-get-pools",
    "Get all available liquidity pools from the DEX",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check available networks through `networks://all`"),
    },
    async ({ networkName }) => {
      await mantraClient.initialize(networkName);
      const pools = await mantraClient.getPools();
      return {
        content: [{type: "text", text: JSON.stringify(pools)}],
      };
    }
  );

  // Find possible swap routes
  server.tool(
    "dex-find-routes",
    "Find available swap routes between two tokens - must first check two tokens are available in the DEX pools by using `dex-get-pools`",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use"),
      tokenInDenom: z.string().describe("Denomination of the token to swap from"),
      tokenOutDenom: z.string().describe("Denomination of the token to swap to"),
    },
    async ({ networkName, tokenInDenom, tokenOutDenom }) => {
      await mantraClient.initialize(networkName);
      const routes = await mantraClient.findSwapRoutes(tokenInDenom, tokenOutDenom);
      return {
        content: [{type: "text", text: JSON.stringify(routes)}],
      };
    }
  );

  // Simulate a swap
  server.tool(
    "dex-simulate-swap",
    "Simulate a token swap to get expected outcome without executing it - must first check two tokens are available in the DEX pools by using `dex-get-pools`",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use"),
      tokenInDenom: z.string().describe("Denomination of the token to swap from"),
      tokenInAmount: z.string().describe("Amount of tokens to swap"),
      tokenOutDenom: z.string().describe("Denomination of the token to swap to"),
    },
    async ({ networkName, tokenInDenom, tokenInAmount, tokenOutDenom }) => {
      await mantraClient.initialize(networkName);
      const simulation = await mantraClient.simulateSwap({
        tokenIn: {
          denom: tokenInDenom,
          amount: tokenInAmount
        },
        tokenOutDenom
      });
      return {
        content: [{type: "text", text: JSON.stringify(convertBigIntToString(simulation))}],
      };
    }
  );

  // Execute a swap
  server.tool(
    "dex-swap",
    "Execute a token swap on the DEX - must first check two tokens are available in the DEX pools by using `dex-get-pools`",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use"),
      tokenInDenom: z.string().describe("Denomination of the token to swap from"),
      tokenInAmount: z.string().describe("Amount of tokens to swap"),
      tokenOutDenom: z.string().describe("Denomination of the token to swap to"),
      slippage: z.string().optional().describe("Maximum acceptable slippage percentage (e.g., '1' for 1%)"),
      memo: z.string().optional().describe("Optional memo for the transaction"),
    },
    async ({ networkName, tokenInDenom, tokenInAmount, tokenOutDenom, slippage, memo }) => {
      await mantraClient.initialize(networkName);
      const result = await mantraClient.swap({
        tokenIn: {
          denom: tokenInDenom,
          amount: tokenInAmount
        },
        tokenOutDenom,
        slippage,
        memo
      });
      
      return {
        content: [{type: "text", text: JSON.stringify(result)}],
      };
    }
  );
}
