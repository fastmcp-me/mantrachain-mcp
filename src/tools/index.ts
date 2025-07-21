import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MantraClient } from '../mantra-client.js';
import { registerBankTools } from './bank.js';
import { registerStakingTools } from './staking.js';
import { registerNetworkTools } from './network.js';
import { registerResources } from './resources.js';
import { registerIBCTools } from './ibc.js';
import { registerContractTools } from './contract.js';
import { registerDexTools } from './dex.js';
import { registerTokenTools } from './token.js';
import { registerTxTools } from './tx.js';

export { registerAllPrompts } from './prompts.js';

export function registerAllTools(server: McpServer, mantraClient: MantraClient) {
  // Register resources first
  registerResources(server);
  
  // Register all tools
  registerBankTools(server, mantraClient);
  registerStakingTools(server, mantraClient);
  registerNetworkTools(server, mantraClient);
  registerIBCTools(server, mantraClient);
  registerContractTools(server, mantraClient);
  registerDexTools(server, mantraClient);
  registerTokenTools(server);
  registerTxTools(server, mantraClient);
}
