# MantraChain MCP Server

A Model Context Protocol (MCP) server for interacting with MantraChain (Cosmos SDK) blockchain. This server provides tools for sending tokens, delegating to validators, querying balances, and more using the MCP protocol.

## Features

- Send tokens to other addresses (bank send)
- Delegate tokens to validators (staking)
- Query account balances
- Get validator information
- Sign and broadcast arbitrary transactions
- Configure mnemonic and network via environment variables
- Choose between Dukong testnet and Mainnet

## Installation

### Option 1: Install from npm

```bash
# Install globally
npm install -g mantrachain-mcp

# Or install locally in your project
npm install mantrachain-mcp
```

### Option 2: Install from source

```bash
# Clone the repository
git clone <repository-url>
cd mantrachain-mcp

# Install dependencies
npm install

# Build the project
npm run build
```


## MCP Configuration

To integrate with MCP client applications, add the server configuration to your MCP client configuration file:

```json
{
  "mcpServers": {
    "mantrachain-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mantrachain-mcp"
      ],
      "env": {
        "MNEMONIC": "YOUR_MNEMONIC",
        "CUSTOM_NETWORKS": "{
            \"rpcEndpoint\": \"https://my-rpc-endpoint.example.com\",
            \"chainId\": \"my-chain-1\",
            \"prefix\": \"mychain\",
            \"denom\": \"utoken\",
            \"gasPrice\": \"0.01\",
            \"isMainnet\": false,
            \"displayDenom\": \"token\",
            \"displayDenomExponent\": 6,
            \"explorerUrl\": \"https://explorer.example.com\"
        }" // optional
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

If you installed the package locally instead of globally:

```json
{
  "mcpServers": {
    "mantrachain-mcp": {
      "command": "node",
      "args": [
        "./node_modules/mantrachain-mcp/build/index.js"
      ],
      "env": {
        "MNEMONIC": "YOUR_MNEMONIC"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```
