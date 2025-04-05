import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { networks } from '../config.js';

export function registerResources(server: McpServer) {
  // Register resource
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

  // Register resource with openapi/swagger specification
  server.resource(
    "openapi - show openapi/swagger specification for the mcp server. It is useful to query the chain when other tools are not available",
    new ResourceTemplate("openapi://{networkName}", { list: undefined }),
    async (uri, { networkName }) => {
      const oapis = "https://oapis.org/overview/";
      const apiEndpoint = networks[networkName as string]["apiEndpoint"].replace(/\/+$/, "");
      
      // First try /openapi/openapi.yaml
      let openapiSpecUrl = `${oapis}${encodeURIComponent(apiEndpoint + '/openapi/openapi.yaml')}`;
      let response = await fetch(openapiSpecUrl);
      
      // If we get a 404, try the fallback URL with swagger path
      if (response.status === 404) {
        openapiSpecUrl = `${oapis}${encodeURIComponent(apiEndpoint + '/swagger/swagger.yaml')}`;
        response = await fetch(openapiSpecUrl);
      }

      const data = await response.text();

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: data
          }
        ]
      };
    }
  );
}
