import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as services from '../evm-services/index.js';
import { MantraClient } from '../mantra-client.js';
import { networks } from '../config.js';

export function registerNetworkTools(server: McpServer, mantraClient: MantraClient) {
  // Define get account info tool
  server.tool(
    "get-account-info",
    "Get current account information",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
    },
    async ({ networkName }) => {
      await mantraClient.initialize(networkName);
      const currentAddressInfo = await mantraClient.getCurrentAddressInfo();
      return {
        content: [{type: "text", text: JSON.stringify(currentAddressInfo)}],
      };
    }
  );

  // Define get current block info tool
  server.tool(
    "get-block-info",
    "Get block information from cometbft rpc",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
      height: z.number().optional().describe("Optional block height to query, defaults to latest block"),
    },
    async ({ networkName, height }) => {
      await mantraClient.initialize(networkName);
      const currentBlockInfo = await mantraClient.getBlockInfo(height);
      return {
        content: [{type: "text", text: JSON.stringify(currentBlockInfo)}],
      };
    }
  );

	// Get block from evm
	server.tool(
		'get-block-info-evm',
		'Get a block information from EVM rpc',
		{
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
      height: z.number().optional().describe("Optional block height to query, defaults to latest block"),
		},
		async ({ height, networkName }) => {
			try {
				const block = await services.getBlockByNumber(height, networkName);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(block)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching block ${height}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

  // Define generic network query tool
  server.tool(
    "query-network",
    "Execute a generic network gRPC Gateway query against chain APIs when you cannot find the required information from other tools. You MUST first check the available query/service by reading the openapi specification from the resource `openapi://{networkName}` to understand available query/service, methods, required parameters and body structure.",
    {
      networkName: z.string().refine(val => Object.keys(networks).includes(val), {
        message: "Must be a valid network name"
      }).describe("Name of the network to use - must first check what networks are available by accessing the networks resource `networks://all` before you pass this arguments. Defaults to `mantra-dukong-1` testnet."),
      path: z.string().describe("API endpoint path from the OpenAPI spec, e.g., '/cosmos/bank/v1beta1/balances/{address}'"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method to use for the request"),
      pathParams: z.record(z.string()).optional().describe("Path parameters to substitute in the URL path"),
      queryParams: z.record(z.string()).optional().describe("Query parameters to add to the request"),
      body: z.any().optional().describe("Request body for POST/PUT requests"),
    },
    async ({ networkName, path, method, pathParams, queryParams, body }) => {
      try {
        await mantraClient.initialize(networkName);
        
        // Build the URL with path parameters
        let url = networks[networkName].apiEndpoint;
        
        // Remove trailing slash from base URL if present
        if (url.endsWith('/')) {
          url = url.slice(0, -1);
        }
        
        // Add path (substitute path parameters if provided)
        if (pathParams) {
          let substitutedPath = path;
          Object.entries(pathParams).forEach(([key, value]) => {
            substitutedPath = substitutedPath.replace(`{${key}}`, encodeURIComponent(String(value)));
          });
          url += substitutedPath;
        } else {
          url += path;
        }
        
        // Add query parameters
        if (queryParams && Object.keys(queryParams).length > 0) {
          const params = new URLSearchParams();
          Object.entries(queryParams).forEach(([key, value]) => {
            params.append(key, String(value));
          });
          url += `?${params.toString()}`;
        }
        
        // Execute request
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        
        const data = await response.json();
        
        return {
          content: [
            {type: "text", text: JSON.stringify(data)}
          ],
        };
      } catch (error) {
        throw new Error(`Failed to execute network query: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
