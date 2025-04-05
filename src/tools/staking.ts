import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';
import { convertBigIntToString } from '../utils.js';

export function registerStakingTools(server: McpServer, mantraClient: MantraClient) {
  // Define delegate tool
  server.tool(
    "delegate",
    "Delegate/Stake tokens to a validator",
    {
      operatorAddress: z.string().describe("Address of the validator to delegate to"),
      amount: z.string().describe("Amount of tokens to delegate"),
      denom: z.string().optional().describe("Optional denomination of the tokens, default is network's default denom"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
      memo: z.string().optional().describe("Optional memo for the transaction")
    },
    async ({ operatorAddress, amount, denom, networkName, memo }) => {
      await mantraClient.initialize(networkName);
      
      // Delegate the tokens
      const result = await mantraClient.stakeTokens({
        operatorAddress,
        amount,
        denom,
        memo
      });
      
      return {
        content: [{type: "text", text: JSON.stringify(result)}],
      };
    }
  );

  // Define undelegate tool
  server.tool(
    "undelegate",
    "Undelegate/Unstake tokens from a validator",
    {
      operatorAddress: z.string().describe("Address of the validator to undelegate from"),
      amount: z.string().describe("Amount of tokens to undelegate"),
      denom: z.string().optional().describe("Optional denomination of the tokens, default is network's default denom"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
      memo: z.string().optional().describe("Optional memo for the transaction")
    },
    async ({ operatorAddress, amount, denom, networkName, memo }) => {
      await mantraClient.initialize(networkName);
      

      const result = await mantraClient.undelegateTokens({
        operatorAddress,
        amount,
        denom,
        memo
      });
      
      return {
        content: [{type: "text", text: JSON.stringify(result)}],
      };
    }
  );

  // Define claim rewards tool
  server.tool(
    "claim-rewards",
    "Claim rewards for a specific validator",
    {
      operatorAddress: z.string().describe("Address of the validator to claim rewards from"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
      memo: z.string().optional().describe("Optional memo for the transaction")
    },
    async ({ operatorAddress, networkName, memo }) => {
      await mantraClient.initialize(networkName);
      
      const result = await mantraClient.claimRewards({
        operatorAddress,
        memo
      });
      
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
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
    },
    async ({ networkName }) => {
      await mantraClient.initialize(networkName);
      const validators = await mantraClient.getValidators();
      return {
        content: [{type: "text", text: JSON.stringify(convertBigIntToString(validators))}],
      };
    }
  );

  // Define get delegations tool
  server.tool(
    "get-delegations",
    "Get current staking information for an address",
    {
      address: z.string().optional().describe("Address to query for delegations"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
    },
    async ({ address, networkName }) => {
      await mantraClient.initialize(networkName);
      const delegations = await mantraClient.getDelegations(address);
      return {
        content: [{type: "text", text: JSON.stringify(convertBigIntToString(delegations))}],
      };
    }
  );

  // Define get available rewards tool
  server.tool(
    "get-available-rewards",
    "Get all available rewards for an address",
    {
      address: z.string().optional().describe("Address to query for available rewards"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available through the mantrachain-mcp server by accessing the networks resource `networks://all` before you pass this arguments"),
    },
    async ({ address, networkName }) => {
      await mantraClient.initialize(networkName);
      const rewards = await mantraClient.getAvailableRewards(address);
      return {
        content: [{type: "text", text: JSON.stringify(convertBigIntToString(rewards))}],
      };
    }
  );
}
