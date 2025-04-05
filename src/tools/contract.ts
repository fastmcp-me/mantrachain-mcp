import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerContractTools(server: McpServer, mantraClient: MantraClient) {
  // Define contract query tool
  server.tool(
    "contract-query",
    "Query a smart contract by executing a read-only function",
    {
      contractAddress: z.string().describe("Address of the smart contract to query"),
      queryMsg: z.record(z.any()).describe("The query message to send to the contract as a JSON object"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the networks resource")
    },
    async ({ contractAddress, queryMsg, networkName }) => {
      await mantraClient.initialize(networkName);
      
      try {
        const result = await mantraClient.queryContract({contractAddress, queryMsg});
        return {
          content: [{type: "text", text: JSON.stringify(result, null, 2)}],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text", 
            text: `Error querying contract: ${error.message || JSON.stringify(error)}`
          }],
        };
      }
    }
  );

  // Define contract execute tool
  server.tool(
    "contract-execute",
    "Execute a function on a smart contract that changes state",
    {
      contractAddress: z.string().describe("Address of the smart contract to execute"),
      executeMsg: z.record(z.any()).describe("The execute message to send to the contract as a JSON object"),
      funds: z.array(
        z.object({
          denom: z.string().optional(),
          amount: z.string()
        })
      ).optional().describe("Optional funds to send with the execution"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check available networks"),
      memo: z.string().optional().describe("Optional memo for the transaction")
    },
    async ({ contractAddress, executeMsg, funds, networkName, memo }) => {
      await mantraClient.initialize(networkName);
      
      // Use network default denom if not provided in funds
      const networkConfig = networks[networkName];
      const defaultDenom = networkConfig.denom;
      
      // Process funds if provided
      let processedFunds = undefined;
      if (funds) {
        processedFunds = funds.map(coin => ({
          denom: coin.denom || defaultDenom,
          amount: coin.amount
        }));
      }
      
      try {
        const result = await mantraClient.executeContract({
          contractAddress, 
          executeMsg, 
          funds: processedFunds,
          memo
        });

        return {
          content: [{
            type: "text", 
            text: `Contract execution successful. Transaction hash: ${result.transactionHash}`
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text", 
            text: `Error executing contract: ${error.message || JSON.stringify(error)}`
          }],
        };
      }
    }
  );
}
