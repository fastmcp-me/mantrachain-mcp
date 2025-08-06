import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Address, Hash, Hex } from 'viem';
import { parseGwei } from 'viem';
import * as services from '../evm-services/index.js';
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerTxTools(server: McpServer, mantraClient: MantraClient) {
  // Define sign and broadcast generic transaction tool
  server.tool(
    "sign-and-broadcast",
    "Sign and broadcast a generic cosmos-sdk transaction",
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
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
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

	// Get transaction by hash
	server.tool(
		'get_transaction',
		'Get detailed information about a specific evm transaction by its hash. Includes sender, recipient, value, data, and more.',
		{
			txHash: z.string().describe("The transaction hash to look up (e.g., '0x1234...')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ txHash, networkName }) => {
			try {
				const tx = await services.getTransaction(txHash as Hash, networkName);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(tx)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching transaction ${txHash}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get transaction receipt
	server.tool(
		'get_transaction_receipt',
		'Get a evm transaction receipt by its hash',
		{
			txHash: z.string().describe("The transaction hash to look up (e.g., '0x1234...')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ txHash, networkName }) => {
			try {
				const receipt = await services.getTransactionReceipt(txHash as Hash, networkName);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(receipt)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching transaction receipt ${txHash}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Estimate gas
	server.tool(
		'estimate_gas',
		'Estimate the gas cost for a transaction',
		{
			to: z.string().describe('The recipient address (e.g., "0x1234...")'),
			value: z.string().optional().describe("The amount of OM to send (e.g., '0.1')"),
			data: z.string().optional().describe('The transaction data as a hex string'),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ to, value, data, networkName }) => {
			try {
				const params: { to: Address; value?: bigint; data?: `0x${string}` } = { to: to as Address };

				if (value) {
					params.value = services.helpers.parseEther(value);
				}

				if (data) {
					params.data = data as `0x${string}`;
				}

				const gas = await services.estimateGas(params, networkName);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									network: networkName,
									estimatedGas: gas.toString()
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
							text: `Error estimating gas: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer OM
	server.tool(
		'transfer_om',
		'Transfer native tokens (OM) to an address via EVM',
		{
			to: z.string().describe("The recipient address (e.g., '0x1234...'"),
			amount: z.string().describe("Amount to send in OM (or the native token of the network), as a string (e.g., '0.1')"),
			networkName: z.string().refine(val => Object.keys(networks).includes(val), {
				message: "Must be a valid network name"
			}).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ to, amount, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const txHash = await services.transferOM(to, amount, networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash,
									to,
									amount,
									network: networkName
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
							text: `Error transferring OM: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer ERC20
	server.tool(
		'transfer_erc20',
		'Transfer ERC20 tokens to another address',
		{
			tokenAddress: z.string().describe('The address of the ERC20 token contract'),
			toAddress: z.string().describe('The recipient address'),
			amount: z.string().describe("The amount of tokens to send (in token units, e.g., '10' for 10 tokens)"),
			networkName: z.string().refine(val => Object.keys(networks).includes(val), {
				message: "Must be a valid network name"
			}).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ tokenAddress, toAddress, amount, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const result = await services.transferERC20(tokenAddress, toAddress, amount, networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network: networkName,
									tokenAddress,
									recipient: toAddress,
									amount: result.amount.formatted,
									symbol: result.token.symbol
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
							text: `Error transferring ERC20 tokens: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Approve ERC20 token spending
	server.tool(
		'approve_token_spending',
		'Approve another address (like a DeFi protocol or exchange) to spend your ERC20 tokens. This is often required before interacting with DeFi protocols.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC20 token to approve for spending (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')"),
			spenderAddress: z.string().describe('The contract address being approved to spend your tokens (e.g., a DEX or lending protocol)'),
			amount: z
				.string()
				.describe(
					"The amount of tokens to approve in token units, not wei (e.g., '1000' to approve spending 1000 tokens). Use a very large number for unlimited approval."
				),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ tokenAddress, spenderAddress, amount, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const result = await services.approveERC20(tokenAddress, spenderAddress, amount, networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network: networkName,
									tokenAddress,
									spender: spenderAddress,
									amount: result.amount.formatted,
									symbol: result.token.symbol
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
							text: `Error approving token spending: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer NFT (ERC721)
	server.tool(
		'transfer_nft',
		'Transfer an NFT (ERC721 token) from one address to another. Requires the private key of the current owner for signing the transaction.',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')"),
			tokenId: z.string().describe("The ID of the specific NFT to transfer (e.g., '1234')"),
			toAddress: z.string().describe('The recipient wallet address that will receive the NFT'),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ tokenAddress, tokenId, toAddress, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const result = await services.transferERC721(tokenAddress, toAddress, BigInt(tokenId), networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network: networkName,
									collection: tokenAddress,
									tokenId: result.tokenId,
									recipient: toAddress,
									name: result.token.name,
									symbol: result.token.symbol
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
							text: `Error transferring NFT: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer ERC1155 token
	server.tool(
		'transfer_erc1155',
		'Transfer ERC1155 tokens to another address. ERC1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC1155 token collection (e.g., '0x76BE3b62873462d2142405439777e971754E8E77')"),
			tokenId: z.string().describe("The ID of the specific token to transfer (e.g., '1234')"),
			amount: z.string().describe("The quantity of tokens to send (e.g., '1' for a single NFT or '10' for 10 fungible tokens)"),
			toAddress: z.string().describe('The recipient wallet address that will receive the tokens'),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ tokenAddress, tokenId, amount, toAddress, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const result = await services.transferERC1155(tokenAddress, toAddress, BigInt(tokenId), amount, networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network: networkName,
									contract: tokenAddress,
									tokenId: result.tokenId,
									amount: result.amount,
									recipient: toAddress
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
							text: `Error transferring ERC1155 tokens: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer ERC20 tokens
	server.tool(
		'transfer_token',
		'Transfer ERC20 tokens to an address',
		{
			tokenAddress: z.string().describe("The contract address of the ERC20 token to transfer (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')"),
			toAddress: z.string().describe("The recipient address that will receive the tokens (e.g., '0x1234...')"),
			amount: z.string().describe("Amount of tokens to send as a string (e.g., '100' for 100 tokens). This will be adjusted for the token's decimals."),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
			maxFeePerGas: z.string().optional().describe("Maximum fee per gas unit in Gwei (e.g., '20' for 20 Gwei)"),
			maxPriorityFeePerGas: z.string().optional().describe("Maximum priority fee per gas unit in Gwei (e.g., '2' for 2 Gwei)"),
		},
		async ({ tokenAddress, toAddress, amount, networkName, maxFeePerGas, maxPriorityFeePerGas }) => {
			try {
				const gasParams = {
					maxFeePerGas: maxFeePerGas ? parseGwei(maxFeePerGas) : undefined,
					maxPriorityFeePerGas: maxPriorityFeePerGas ? parseGwei(maxPriorityFeePerGas) : undefined,
				};

				const result = await services.transferERC20(tokenAddress, toAddress, amount, networkName, gasParams);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									tokenAddress,
									toAddress,
									amount: result.amount.formatted,
									symbol: result.token.symbol,
									network: networkName
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
							text: `Error transferring tokens: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);


}
