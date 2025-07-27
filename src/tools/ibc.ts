import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerIBCTools(server: McpServer, mantraClient: MantraClient) {
  // Define IBC transfer tool
  server.tool(
    "ibc-transfer",
    "Send tokens via IBC transfer.",
    {
      recipientAddress: z.string().describe("Address of the recipient"),
      transferAmount: z.object({
        denom: z.string(),
        amount: z.string()
      }).describe("Amount to send"),
      sourcePort: z.string().optional().describe("Source port for the IBC transfer"),
      sourceChannel: z.string().describe("Source channel for the IBC transfer"),
      timeoutHeight: z.object({
        revisionNumber: z.number(),
        revisionHeight: z.number()
      }).optional().describe("Timeout height for the IBC transfer"),
      timeoutTimestamp: z.number().optional().describe("Timeout timestamp for the IBC transfer"),
      ibcMemo: z.string().optional().describe("Optional memo for the IBC transfer"),
      memo: z.string().optional().describe("Optional memo for the transaction"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
    },
    async ({ recipientAddress, transferAmount, sourcePort, sourceChannel, timeoutHeight, timeoutTimestamp, ibcMemo, memo, networkName }) => {
      await mantraClient.initialize(networkName);
      const processedTimeoutHeight = timeoutHeight 
        ? { 
            revisionNumber: BigInt(timeoutHeight.revisionNumber), 
            revisionHeight: BigInt(timeoutHeight.revisionHeight) 
          } 
        : undefined;
        
      const result = await mantraClient.sendIBCTransfer({
        recipientAddress,
        transferAmount,
        sourcePort,
        sourceChannel,
        timeoutHeight: processedTimeoutHeight,
        timeoutTimestamp,
        ibcMemo,
        memo
      });
      
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
