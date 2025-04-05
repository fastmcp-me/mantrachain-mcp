import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerTxTools(server: McpServer, mantraClient: MantraClient) {
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
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
      memo: z.string().optional().describe("Optional memo for the transaction")
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
}
