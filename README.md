[![Add to Cursor](https://fastmcp.me/badges/cursor_dark.svg)](https://fastmcp.me/MCP/Details/867/mantra-chain)
[![Add to VS Code](https://fastmcp.me/badges/vscode_dark.svg)](https://fastmcp.me/MCP/Details/867/mantra-chain)
[![Add to Claude](https://fastmcp.me/badges/claude_dark.svg)](https://fastmcp.me/MCP/Details/867/mantra-chain)
[![Add to ChatGPT](https://fastmcp.me/badges/chatgpt_dark.svg)](https://fastmcp.me/MCP/Details/867/mantra-chain)
[![Add to Codex](https://fastmcp.me/badges/codex_dark.svg)](https://fastmcp.me/MCP/Details/867/mantra-chain)
[![Add to Gemini](https://fastmcp.me/badges/gemini_dark.svg)](https://fastmcp.me/MCP/Details/867/mantra-chain)

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/allthatjazzleo-mantrachain-mcp-badge.png)](https://mseep.ai/app/allthatjazzleo-mantrachain-mcp)

# MantraChain MCP Server

[![smithery badge](https://smithery.ai/badge/@allthatjazzleo/mantrachain-mcp)](https://smithery.ai/server/@allthatjazzleo/mantrachain-mcp)

A Model Context Protocol (MCP) server for interacting with MantraChain (Cosmos SDK) blockchain. This server provides tools for sending tokens, delegating to validators, querying balances, and more using the MCP protocol.

## Features

- Send tokens to other addresses (bank send)
- Delegate tokens to validators (staking)
- Query account balances
- Get validator information
- Sign and broadcast arbitrary transactions
- Configure mnemonic and network via environment variables
- Choose between Dukong testnet and Mainnet
- **Supports both stdio and HTTP+SSE transport modes**

## Available Tools

### Bank Operations
- **bank-send**: Send tokens to another address (supports multiple coins per transaction)
- **get-balance**: Get balance of an address (defaults to your own address if none provided)
- **get_evm_balance**: Get native token (OM) balance for an EVM address
- **get_token_balance**: Get ERC20 token balance for an address
- **get_nft_balance**: Get ERC721 NFT count for an address from a collection
- **get_erc1155_balance**: Get ERC1155 token balance for a specific token ID
- **get_address_from_mnemonic**: Get EVM address derived from mnemonic

### Staking Operations
- **delegate**: Delegate/Stake tokens to a validator
- **undelegate**: Undelegate/Unstake tokens from a validator
- **claim-rewards**: Claim rewards for a specific validator
- **get-validators**: Get all validators
- **get-delegations**: Get current staking information for an address
- **get-available-rewards**: Get all available rewards for an address

### Network Operations
- **get-account-info**: Get current account information
- **get-block-info**: Get block information from Cosmos (cometbft) RPC
- **get-block-info-evm**: Get block information from EVM RPC
- **query-network**: Execute a generic network query against chain APIs

### IBC Operations
- **ibc-transfer**: Send tokens via IBC transfer

### Smart Contract Operations
- **cosmwasm-contract-query**: Query a CosmWasm smart contract (read-only)
- **cosmwasm-contract-execute**: Execute a function on a CosmWasm contract (state-changing)
- **read_evm_contract**: Read data from an EVM contract (view/pure function)
- **write_evm_contract**: Write data to an EVM contract (state-changing function)
- **deploy_evm_contract**: Deploy a new EVM contract
- **is_contract**: Check if an address is a contract or EOA

### DEX Operations
- **dex-get-pools**: Get all available liquidity pools from the DEX
- **dex-find-routes**: Find available swap routes between two tokens
- **dex-simulate-swap**: Simulate a token swap to get expected outcome without executing it
- **dex-swap**: Execute a token swap on the DEX with slippage protection

### Transaction Operations
- **sign-and-broadcast**: Sign and broadcast a generic Cosmos transaction
- **get_transaction**: Get detailed information about a specific EVM transaction by hash
- **get_transaction_receipt**: Get EVM transaction receipt by hash
- **estimate_gas**: Estimate gas cost for a transaction
- **transfer_om**: Transfer native tokens (OM) via EVM
- **transfer_erc20**: Transfer ERC20 tokens to another address
- **approve_token_spending**: Approve another address to spend your ERC20 tokens
- **transfer_nft**: Transfer an ERC721 NFT to another address
- **transfer_erc1155**: Transfer ERC1155 tokens to another address
- **transfer_token**: Transfer ERC20 tokens to an address

## Available Resources

- **networks://all**: JSON resource showing all available networks with their configuration
- **openapi://{networkName}**: OpenAPI/Swagger specification for the specified network

## Running the Server

The server can run in two modes:

1.  **Stdio Mode (Default):** Communicates over standard input/output. This is the default mode when running the server directly or via `npx`.
    ```bash
    # Using installed package
    mantrachain-mcp

    # Using npx
    npx -y mantrachain-mcp@latest

    ```

2.  **Streamable HTTP Mode:** Runs an HTTP server on port 3000, communicating via Server-Sent Events (SSE). Activate this mode using the `--http` flag or the dedicated npm scripts.
    ```bash
    # Using installed package
    mantrachain-mcp --http

    # Using npx
    export MNEMONIC="YOUR_MNEMONIC"
    export CUSTOM_NETWORKS="YOUR_CUSTOM_NETWORKS_JSON"
    npx -y mantrachain-mcp@latest -- --http
    ```

## MCP Configuration

### Installing via Smithery

To install MantraChain MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@allthatjazzleo/mantrachain-mcp):

```bash
npx -y @smithery/cli install @allthatjazzleo/mantrachain-mcp --client claude
```

### To integrate with MCP client applications, add the server configuration to your MCP client configuration file:

```json
{
  "mcpServers": {
    "mantrachain-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mantrachain-mcp@latest"
      ],
      "env": {
        "MNEMONIC": "YOUR_MNEMONIC",
        "CUSTOM_NETWORKS": "{\"my-custom-net\":{\"rpcEndpoint\":\"https://rpc.custom-network.io\",\"apiEndpoint\":\"https://api.custom-network.io\",\"chainId\":\"my-custom-net-1\",\"prefix\":\"custom\",\"denom\":\"ucustom\",\"gasPrice\":\"0.01\",\"isMainnet\":false}}"
      }
    }
  }
}
```

### Connecting remote MCP server in [cline](https://docs.cline.bot/mcp-servers/connecting-to-a-remote-server):

```json
{
  "mcpServers": {
    "mantrachain-mcp-sse": {
      "url": "http://localhost:3000/sse",
      "transportType": "sse"
    }
  }
}
```


### If you build the package locally instead of globally

After building the package, you can run it directly from the build directory. Make sure to replace `your_path` with the actual path to your build directory.
```bash
npm run build
```

Then, you can use the following configuration:

```json
{
  "mcpServers": {
    "mantrachain-mcp": {
      "command": "node",
      "args": [
        "your_path/mantrachain-mcp/build/index.js"
      ],
      "env": {
        "MNEMONIC": "YOUR_MNEMONIC"
      }
    }
  }
}
```

## Environment Variables

- **MNEMONIC**: Required. The mnemonic seed phrase for the wallet to use.
- **CUSTOM_NETWORKS**: Optional. JSON string containing additional network configurations.
