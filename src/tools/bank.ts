import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerBankTools(server: McpServer, mantraClient: MantraClient) {
  // Define bank send tool
  server.tool(
    "bank-send",
    "Send tokens to another address. Supports sending multiple coins in one transaction.",
    {
      recipientAddress: z.string().describe("Address of the recipient"),
      coins: z.array(
        z.object({
          denom: z.string().optional(),
          amount: z.string()
        })
      ).or(
        z.object({
          denom: z.string().optional(),
          amount: z.string()
        })
      ).describe("Array of coins to send, each with denom and amount"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
      memo: z.string().optional().describe("Optional memo for the transaction"),
    },
    async ({ recipientAddress, coins, networkName, memo }) => {
      await mantraClient.initialize(networkName);
      
      // Use network default denom if not provided
      const networkConfig = networks[networkName];
      const defaultDenom = networkConfig.denom;
      
      // Convert single coin to array for consistent processing
      const coinArray = Array.isArray(coins) ? coins : [coins];
      
      // Add default denom if not specified
      const processedCoins = coinArray.map(coin => ({
        denom: coin.denom || defaultDenom,
        amount: coin.amount
      }));
      
      // Send the tokens
      const result = await mantraClient.sendTokens({
        recipientAddress,
        coins: processedCoins,
        memo
      });
      
      return {
        content: [{type: "text", text: JSON.stringify(result)}],
      };
    }
  );

  // Define get balance tool
  server.tool(
    "get-balance",
    "Get balance of an address (defaults to your own address if none provided)",
    {
      address: z.string().optional().describe("Optional address to get balance for, defaults to current address"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
    },
    async ({ address, networkName }) => {
      await mantraClient.initialize(networkName);
      const balance = await mantraClient.getBalance(address);
      return {
        content: [{type: "text", text: JSON.stringify(balance)}],
      };
    }
  );
}
