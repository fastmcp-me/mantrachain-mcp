import dotenv from 'dotenv';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

// Load environment variables
dotenv.config();

export interface NetworkConfig {
  rpcEndpoint: string;
  apiEndpoint: string;
  chainId: string;
  prefix: string;
  denom: string;
  gasPrice: string;
  isMainnet: boolean;
  defaultNetwork?: boolean;
  displayDenom?: string;
  displayDenomExponent?: number;
  explorerUrl?: string;
}

// Network configurations
const NETWORKS: Record<string, NetworkConfig> = {
  "mantra-dukong-1": {
    rpcEndpoint: 'https://rpc.dukong.mantrachain.io',
    apiEndpoint: 'https://api.dukong.mantrachain.io',
    chainId: 'mantra-dukong-1',
    prefix: 'mantra',
    denom: 'uom',
    gasPrice: '0.01',
    isMainnet: false,
    defaultNetwork: true,
    displayDenom: 'om',
    displayDenomExponent: 6,
    explorerUrl: 'https://www.mintscan.io/mantra-testnet'
  },
  "mantra-1": {
    rpcEndpoint: 'https://rpc.mantrachain.io',
    apiEndpoint: 'https://api.mantrachain.io',
    chainId: 'mantra-1',
    prefix: 'mantra',
    denom: 'uom',
    gasPrice: '0.01',
    isMainnet: true,
    defaultNetwork: false,
    displayDenom: 'om',
    displayDenomExponent: 6,
    explorerUrl: 'https://www.mintscan.io/mantra'
  },
};

// Add custom networks from environment variable if available
if (process.env.CUSTOM_NETWORKS) {
  try {
    const customNetworks = JSON.parse(process.env.CUSTOM_NETWORKS);
    Object.assign(NETWORKS, customNetworks);
    console.log('Custom networks loaded:', Object.keys(customNetworks));
  } catch (error) {
    console.error('Failed to parse CUSTOM_NETWORKS:', error);
  }
}

export const networks = NETWORKS;
export const mnemonic = process.env.MNEMONIC;

if (!mnemonic) {
  throw new Error('MNEMONIC environment variable is required.');
}

// Create wallet from mnemonic
export async function getWallet(networkName: string = 'mantra-dukong-1') {
  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic!, {
    prefix: networks[networkName].prefix,
  });
}
