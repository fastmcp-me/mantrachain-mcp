import { SigningStargateClient, QueryClient, setupStakingExtension, StakingExtension, GasPrice } from '@cosmjs/stargate';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Coin, EncodeObject } from '@cosmjs/proto-signing';
import { getWallet, networks, NetworkConfig } from './config.js';
import { Comet38Client } from '@cosmjs/tendermint-rpc';
import { TransactionResponse } from './types.js';

export interface BankSendParams {
  recipientAddress: string;
  coins: Coin[];
  memo?: string;
}

export interface StakeParams {
  operatorAddress: string;
  amount: string;
  denom?: string;
  memo?: string;
}

export class MantraClient {
  private wasmClient: SigningCosmWasmClient | null = null;
  private stargateClient: SigningStargateClient | null = null;
  private queryClient: (QueryClient & StakingExtension) | null = null;
  private address: string | null = null;
  private network: NetworkConfig | null = null; 

  async initialize(networkName: string) {
    if (!Object.keys(networks).includes(networkName)) {
      // fallback to default network if the provided one is not valid
      networkName = 'mantra-dukong-1';
    }
    this.network = networks[networkName];
    const wallet = await getWallet(networkName);
    const [firstAccount] = await wallet.getAccounts();
    this.address = firstAccount.address;

    const gasPrice = GasPrice.fromString(`${this.network.gasPrice}${this.network.denom}`);
    
    this.wasmClient = await SigningCosmWasmClient.connectWithSigner(
      this.network.rpcEndpoint,
      wallet,
      { gasPrice }
    );

    this.stargateClient = await SigningStargateClient.connectWithSigner(
      this.network.rpcEndpoint,
      wallet,
      { gasPrice }
    );

    const cometClient = await Comet38Client.connect(this.network.rpcEndpoint);

    this.queryClient = QueryClient.withExtensions(
      cometClient,
      setupStakingExtension
    );

    return {
      address: this.address,
      chainId: await this.wasmClient.getChainId(),
    };
  }

  /**
   * Send tokens to another address
   */
  async sendTokens({
    recipientAddress,
    coins,
    memo = ''
  }: BankSendParams): Promise<TransactionResponse> {
    if (!this.stargateClient || !this.wasmClient || !this.address || !this.network) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {
      const result = await this.stargateClient.sendTokens(
        this.address,
        recipientAddress,
        coins,
        'auto',
        memo
      );

      return {
        transactionHash: result.transactionHash,
        explorerUrl: `${this.network.explorerUrl}/tx/${result.transactionHash}`,
        success: result.code === 0,
        gasUsed: result.gasUsed.toString(),
        gasWanted: result.gasWanted.toString()  ,
      };
    } catch (error) {
      throw new Error(`Failed to send tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Query account balance
   */
  async getBalance(address?: string) {
    if (!this.stargateClient || !this.wasmClient) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    const targetAddress = address || this.address;
    if (!targetAddress) {
      throw new Error('No address provided and no default address set.');
    }

    try {
      const balance = await this.stargateClient.getAllBalances(targetAddress);
      return balance;
    } catch (error) {
      throw new Error(`Failed to query balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all validators on the network
   */
  async getValidators() {
    if (!this.queryClient) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {
      const response = await this.queryClient.staking.validators('BOND_STATUS_BONDED');
      const validators = response.validators.sort((a, b) => {
        return Number(BigInt(b.tokens) - BigInt(a.tokens));
      });
      return validators;
    } catch (error) {
      throw new Error(`Failed to fetch validators: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stake (delegate) tokens to a validator
   */
  async stakeTokens({
    operatorAddress,
    amount,
    denom,
    memo = ''
  }: StakeParams): Promise<TransactionResponse> {
    if (!this.stargateClient || !this.wasmClient || !this.address || !this.network) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    // Use the provided denom or fallback to network's default denom
    denom = denom || this.network.denom;

      // Convert amount to base units (assuming amount is in whole tokens) if denom is display denom
    if (this.network.displayDenom && this.network.displayDenomExponent) {
      const displayDenom = this.network.displayDenom;
      const displayDenomExponent = this.network.displayDenomExponent;
      if (denom === displayDenom) {
        const displayAmount = BigInt(parseFloat(amount) * Math.pow(10, displayDenomExponent));
        amount = displayAmount.toString();
        denom = this.network.denom;
      }
    }
    
    const coin: Coin = {
      denom,
      amount
    };

    try {
      const result = await this.stargateClient.delegateTokens(
        this.address,
        operatorAddress,
        coin,
        'auto',
        memo
      );

      return {
        transactionHash: result.transactionHash,
        explorerUrl: `${this.network.explorerUrl}/tx/${result.transactionHash}`,
        success: result.code === 0,
        gasUsed: result.gasUsed.toString(),
        gasWanted: result.gasWanted.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to stake tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the current address
   */
  async getCurrentAddressInfo() {
    if (!this.address) {
      throw new Error('No address set.');
    }
    return {
      address: this.address,
      network: this.network,
      explorerUrl: `${this.network?.explorerUrl}/address/${this.address}`,
    };
  }

  /**
   * Sign and broadcast a transaction
   * @param messages A single message or array of messages to broadcast
   * @param memo Optional memo to include with the transaction
   */
  async signAndBroadcast(messages: EncodeObject[], memo = ''): Promise<TransactionResponse> {
    if (!this.stargateClient || !this.address || !this.network) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {      
      const result = await this.stargateClient.signAndBroadcast(
        this.address,
        messages,
        'auto',
        memo
      );

      return {
        transactionHash: result.transactionHash,
        explorerUrl: `${this.network.explorerUrl}/tx/${result.transactionHash}`,
        success: result.code === 0,
        gasUsed: result.gasUsed.toString(),
        gasWanted: result.gasWanted.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to sign and broadcast transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
