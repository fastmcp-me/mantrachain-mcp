import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Address } from 'viem';
import * as services from '../evm-services/index.js';
import { networks } from '../config.js';

export function registerTokenTools(server: McpServer) {
	// Get NFT (ERC721) information
	server.tool(
		'get_nft_info',
		'Get detailed information about a specific NFT (ERC721 token), including collection name, symbol, token URI, and current owner if available.',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')"),
			tokenId: z.string().describe("The ID of the specific NFT token to query (e.g., '1234')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ tokenAddress, tokenId, networkName }) => {
			try {
				const nftInfo = await services.getERC721TokenMetadata(tokenAddress as Address, BigInt(tokenId), networkName);

				// Check ownership separately
				let owner: `0x${string}` | null = null;
				try {
					// This may fail if tokenId doesn't exist
					owner = await services.getPublicClient(networkName).readContract({
						address: tokenAddress as Address,
						abi: [
							{
								inputs: [{ type: 'uint256' }],
								name: 'ownerOf',
								outputs: [{ type: 'address' }],
								stateMutability: 'view',
								type: 'function'
							}
						],
						functionName: 'ownerOf',
						args: [BigInt(tokenId)]
					});
				} catch (e) {
					// Ownership info not available
				}

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									contract: tokenAddress,
									tokenId,
									network: networkName,
									...nftInfo,
									owner: owner || 'Unknown'
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
							text: `Error fetching NFT info: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Check NFT ownership
	server.tool(
		'check_nft_ownership',
		'Check if an address owns a specific NFT',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')"),
			tokenId: z.string().describe("The ID of the NFT to check (e.g., '1234')"),
			ownerAddress: z.string().describe("The wallet address to check ownership against (e.g., '0x1234...')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ tokenAddress, tokenId, ownerAddress, networkName }) => {
			try {
				const isOwner = await services.isNFTOwner(tokenAddress, ownerAddress, BigInt(tokenId), networkName);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									tokenAddress,
									tokenId,
									ownerAddress,
									network: networkName,
									isOwner,
									result: isOwner ? 'Address owns this NFT' : 'Address does not own this NFT'
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
							text: `Error checking NFT ownership: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Add tool for getting ERC1155 token URI
	server.tool(
		'get_erc1155_token_uri',
		'Get the metadata URI for an ERC1155 token (multi-token standard used for both fungible and non-fungible tokens). The URI typically points to JSON metadata about the token.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC1155 token collection (e.g., '0x5B6D32f2B55b62da7a8cd553857EB6Dc26bFDC63')"),
			tokenId: z.string().describe("The ID of the specific token to query metadata for (e.g., '1234')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ tokenAddress, tokenId, networkName }) => {
			try {
				const uri = await services.getERC1155TokenURI(tokenAddress as Address, BigInt(tokenId), networkName);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									contract: tokenAddress,
									tokenId,
									network: networkName,
									uri
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
							text: `Error fetching ERC1155 token URI: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get ERC20 token information
	server.tool(
		'get_erc20_token_info',
		'Get comprehensive information about an ERC20 token including name, symbol, decimals, total supply, and other metadata. Use this to analyze any token on EVM chains.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC20 token (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')"),
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
		},
		async ({ tokenAddress, networkName }) => {
			try {
				const tokenInfo = await services.getERC20TokenInfo(tokenAddress as Address, networkName);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address: tokenAddress,
									network: networkName,
									...tokenInfo
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
							text: `Error fetching token info: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

}
