import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Address, Hash, Hex } from 'viem';
import { parseGwei } from 'viem';
import * as services from '../evm-services/index.js';
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerContractTools(server: McpServer, mantraClient: MantraClient) {
  // Define contract query tool
  server.tool(
    "cosmwasm-contract-query",
    "Query a smart cosmwasm contract by executing a read-only function",
    {
      contractAddress: z.string().describe("Address of the cosmwasm contract to query"),
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
    "cosmwasm-contract-execute",
    "Execute a function on a cosmwasm contract that changes state",
    {
      contractAddress: z.string().describe("Address of the cosmwasm contract to execute"),
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

	// Read EVM contract
	server.tool(
		'read_evm_contract',
		"Read data from a evm contract by calling a view/pure function. This doesn't modify blockchain state and doesn't require gas or signing.",
		{
			contractAddress: z.string().describe('The address of the evm contract to interact with'),
			abi: z.array(z.unknown()).describe('The ABI (Application Binary Interface) of the smart contract function, as a JSON array'),
			functionName: z.string().describe("The name of the function to call on the contract (e.g., 'balanceOf')"),
			args: z.array(z.unknown()).optional().describe("The arguments to pass to the function, as an array (e.g., ['0x1234...'])"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ contractAddress, abi, functionName, args = [], networkName }) => {
			try {
				// Parse ABI if it's a string
				const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;

				const params = {
					address: contractAddress as Address,
					abi: parsedAbi,
					functionName,
					args
				};

				const result = await services.readContract(params, networkName);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(result)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error reading contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Write to EVM contract
	server.tool(
		'write_evm_contract',
		'Write data to a evm contract by calling a state-changing function. This modifies blockchain state and requires gas payment and transaction signing.',
		{
			contractAddress: z.string().describe('The address of the evm contract to interact with'),
			abi: z.array(z.unknown()).describe('The ABI (Application Binary Interface) of the smart contract function, as a JSON array'),
			functionName: z.string().describe("The name of the function to call on the contract (e.g., 'transfer')"),
			args: z.array(z.unknown()).describe("The arguments to pass to the function, as an array (e.g., ['0x1234...', '1000000000000000000'])"),
			networkName: z.string().refine(val => Object.keys(networks).includes(val), {
				message: "Must be a valid network name"
			}).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ contractAddress, abi, functionName, args, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				// Parse ABI if it's a string
				const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;

				const contractParams: Record<string, unknown> = {
					address: contractAddress as Address,
					abi: parsedAbi,
					functionName,
					args
				};

				// Add optional gas parameters
				if (maxFeePerGas) contractParams.maxFeePerGas = parseGwei(maxFeePerGas);
				if (maxPriorityFeePerGas) contractParams.maxPriorityFeePerGas = parseGwei(maxPriorityFeePerGas);

				const txHash = await services.writeContract(contractParams, networkName);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									network: networkName,
									transactionHash: txHash,
									message: 'Contract write transaction sent successfully'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error writing to contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Deploy contract
	server.tool(
		'deploy_evm_contract',
		'Deploy a new evm contract to the blockchain. This creates a new contract instance and returns both the deployment transaction hash and the deployed contract address.',
		{
			bytecode: z.string().describe("The compiled contract bytecode as a hex string (e.g., '0x608060405234801561001057600080fd5b50...')"),
			abi: z.array(z.unknown()).describe('The ABI (Application Binary Interface) of the smart contract function, as a JSON array'),
			args: z
				.array(z.unknown())
				.optional()
				.describe(
					"The constructor arguments to pass during deployment, as an array (e.g., ['param1', 'param2']). Leave empty if constructor has no parameters."
				),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ bytecode, abi, args = [], networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				// Parse ABI if it's a string
				const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;

				// Ensure bytecode is a proper hex string
				const formattedBytecode = bytecode.startsWith('0x') ? (bytecode as Hex) : (`0x${bytecode}` as Hex);

				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const result = await services.deployContract(formattedBytecode, parsedAbi, args, networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									network: networkName,
									contractAddress: result.address,
									transactionHash: result.transactionHash,
									message: 'Contract deployed successfully'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error deploying contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Check if address is a contract
	server.tool(
		'is_contract',
		'Check if an address is a smart contract or an externally owned account (EOA)',
		{
			address: z.string().describe("The wallet or contract address to check (e.g., '0x1234...')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ address, networkName }) => {
			try {
				const isContract = await services.isContract(address, networkName);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address,
									network: networkName,
									isContract,
									type: isContract ? 'Contract' : 'Externally Owned Account (EOA)'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error checking if address is a contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

}
