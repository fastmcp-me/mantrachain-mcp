import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from "zod";
import { MantraClient } from './mantra-client.js';
import { networks } from './config.js';
import { convertBigIntToString } from './utils.js';

export async function startMCPServer() {
  const mantraClient = new MantraClient();

  // Create MCP server
  const server = new McpServer({
    name: 'MantraChain MCP Server - interact with the blockchain',
    version: '1.0.0',
  });

  // Register resource first - move this up before any tools are defined
  server.resource(
    "networks - show available networks where the key is the network name and value is network configuration including rpcEndpoint, chainId, prefix, denom, gasPrice, isMainnet, defaultNetwork, displayDenom, displayDenomExponent, explorerUrl",
    "networks://all",
    async (uri) => {
      const networkData = networks;
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(networkData)
          }
        ]
      };
    }
  );

  // Define bank send tool
  server.tool(
    "bank-send",
    "Send tokens to another address. Supports sending multiple coins in one transaction.",
    {
      recipientAddress: z.string(),
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
      ),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }),
      memo: z.string().optional()
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

  // Define delegate tool
  server.tool(
    "delegate",
    "Delegate/Stake tokens to a validator",
    {
      operatorAddress: z.string(),
      amount: z.string(),
      denom: z.string().optional(),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }),
      memo: z.string().optional()
    },
    async ({ operatorAddress, amount, denom, networkName, memo }) => {
      await mantraClient.initialize(networkName);
      
      // Use network default denom if not provided
      const networkConfig = networks[networkName];
      const defaultDenom = networkConfig.denom;
      
      // Delegate the tokens
      const result = await mantraClient.stakeTokens({
        operatorAddress,
        amount,
        denom: denom || defaultDenom,
        memo
      });
      
      return {
        content: [{type: "text", text: JSON.stringify(result)}],
      };
    }
  );

  // Define sign and broadcast generic transaction tool
  server.tool(
    "sign-and-broadcast",
    "Sign and broadcast a generic transaction",
    {
      messages: z.union([
        z.object({
          typeUrl: z.string(),
          value: z.any()
        }),
        z.array(
          z.object({
            typeUrl: z.string(),
            value: z.any()
          })
        )
      ]).describe("Transaction message(s) to sign and broadcast"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }),
      memo: z.string().optional()
    },
    async ({ messages, networkName, memo = "" }) => {
      await mantraClient.initialize(networkName);

      const typedMessages = Array.isArray(messages) 
        ? messages.map(msg => ({ typeUrl: msg.typeUrl, value: msg.value })) 
        : [{ typeUrl: messages.typeUrl, value: messages.value }];

      const result = await mantraClient.signAndBroadcast(typedMessages, memo);
      
      return {
        content: [{type: "text", text: JSON.stringify(result)}],
      };
    }
  );

  // Define get validators tool
  server.tool(
    "get-validators",
    "Get all validators",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }),
    },
    async ({ networkName }) => {
      await mantraClient.initialize(networkName);
      const validators = await mantraClient.getValidators();
      return {
        content: [{type: "text", text: JSON.stringify(convertBigIntToString(validators))}],
      };
    }
  );

  // Define get balance tool
  server.tool(
    "get-balance",
    "Get balance of an address (defaults to your own address if none provided)",
    {
      address: z.string().optional(),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }),
    },
    async ({ address, networkName }) => {
      await mantraClient.initialize(networkName);
      const balance = await mantraClient.getBalance(address);
      return {
        content: [{type: "text", text: JSON.stringify(balance)}],
      };
    }
  );

  // Define get account info tool
  server.tool(
    "get-account-info",
    "Get current account information",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }),
    },
    async ({ networkName }) => {
      await mantraClient.initialize(networkName);
      const currentAddressInfo = await mantraClient.getCurrentAddressInfo();
      return {
        content: [{type: "text", text: JSON.stringify(currentAddressInfo)}],
      };
    }
  );

  // Connect server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
