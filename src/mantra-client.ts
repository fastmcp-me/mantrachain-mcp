import { SigningStargateClient, QueryClient, setupStakingExtension, StakingExtension, setupDistributionExtension, DistributionExtension, GasPrice } from '@allthatjazzleo/stargate';
import { SigningCosmWasmClient } from '@allthatjazzleo/cosmwasm-stargate';
import { EncodeObject } from '@allthatjazzleo/proto-signing';
import { getWallet, getEvmWallet, networks, NetworkConfig } from './config.js';
import { Comet38Client } from '@cosmjs/tendermint-rpc';
import { TransactionResponse } from './types.js';
import { BankService, BankSendParams } from './services/bank-service.js';
import { StakingService, StakeParams, ClaimRewardsParams } from './services/staking-service.js';
import { NetworkService } from './services/network-service.js';
import { TxService } from './services/tx-service.js';
import { IBCService, IBCTransferParams } from './services/ibc-service.js';
import { ContractService, ContractQueryParams, ContractExecuteParams } from './services/contract-service.js';
import { DexService, SwapParams, PoolInfo, SwapOperation } from './services/dex-service.js';

export class MantraClient {
  private wasmClient: SigningCosmWasmClient | null = null;
  private stargateClient: SigningStargateClient | null = null;
  private queryClient: (QueryClient & StakingExtension & DistributionExtension) | null = null;
  private cometClient: Comet38Client | null = null;
  private address: string | null = null;
  private network: NetworkConfig | null = null; 
  
  // Service instances
  private bankService: BankService | null = null;
  private stakingService: StakingService | null = null;
  private networkService: NetworkService | null = null;
  private txService: TxService | null = null;
  private ibcService: IBCService | null = null;
  private contractService: ContractService | null = null;
  private dexService: DexService | null = null;  // Add DEX service

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
    this.wasmClient = await SigningCosmWasmClient.connectWithSigner(this.network.rpcEndpoint, wallet, { gasPrice });
    this.stargateClient = await SigningStargateClient.connectWithSigner(this.network.rpcEndpoint, wallet, { gasPrice });
    this.cometClient = await Comet38Client.connect(this.network.rpcEndpoint);
    this.queryClient = QueryClient.withExtensions(
      this.cometClient, 
      setupStakingExtension,
      setupDistributionExtension,
    );

    // Initialize services
    if (this.stargateClient && this.wasmClient && this.queryClient && this.address && this.network) {
      this.bankService = new BankService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
      this.stakingService = new StakingService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
      this.networkService = new NetworkService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
      this.txService = new TxService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
      this.ibcService = new IBCService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
      this.contractService = new ContractService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
      // Initialize DEX service
      this.dexService = new DexService(
        this.stargateClient,
        this.wasmClient,
        this.queryClient,
        this.cometClient,
        this.address,
        this.network
      );
    }

    return {
      address: this.address,
      chainId: await this.wasmClient.getChainId(),
    };
  }

  /**
   * Send tokens to another address
   */
  async sendTokens(params: BankSendParams): Promise<TransactionResponse> {
    if (!this.bankService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.bankService.sendTokens(params);
  }

  /**
   * Query account balance
   */
  async getBalance(address?: string) {
    if (!this.bankService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.bankService.getBalance(address);
  }

  /**
   * Get all validators on the network
   */
  async getValidators() {
    if (!this.stakingService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.stakingService.getValidators();
  }

  /**
   * Get the current staking information for the address
   */
  async getDelegations(address?: string) {
    if (!this.stakingService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.stakingService.getDelegations(address);
  }

  /**
   * Get all available rewards for the address
   */
  async getAvailableRewards(address?: string) {
    if (!this.stakingService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.stakingService.getAvailableRewards(address);
  }

  /**
   * Stake (delegate) tokens to a validator
   */
  async stakeTokens(params: StakeParams): Promise<TransactionResponse> {
    if (!this.stakingService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.stakingService.stakeTokens(params);
  }
  

  /**
   * Undelegate (unstake) tokens from a validator
   */
  async undelegateTokens(params: StakeParams): Promise<TransactionResponse> {
    if (!this.stakingService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.stakingService.undelegateTokens(params);
  }

  /**
   * Claim rewards for the address
   */
  async claimRewards(params: ClaimRewardsParams): Promise<TransactionResponse> {
    if (!this.stakingService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.stakingService.claimRewards(params);
  }

  /**
   * Get the current address
   */
  async getCurrentAddressInfo() {
    if (!this.networkService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.networkService.getCurrentAddressInfo();
  }

  /**
   * Get the current block height
   */
  async getBlockInfo(height?: number) {
    if (!this.networkService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.networkService.getBlockInfo(height);
  }

  /**
   * Send IBC transfer
   * @param params Parameters for the IBC transfer
   */
  async sendIBCTransfer(params: IBCTransferParams): Promise<TransactionResponse> {
    if (!this.ibcService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.ibcService.sendIBCTransfer(params);
  }

  /**
   * Sign and broadcast a transaction
   * @param messages A single message or array of messages to broadcast
   * @param memo Optional memo to include with the transaction
   */
  async signAndBroadcast(messages: EncodeObject[], memo = ''): Promise<TransactionResponse> {
    if (!this.txService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.txService.signAndBroadcast(messages, memo);
  }

  /**
   * Query a smart contract by executing a read-only function
   * @param params Parameters for the contract query
   */
  async queryContract(params: ContractQueryParams): Promise<any> {
    if (!this.contractService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.contractService.queryContract(params);
  }

  /**
   * Execute a function on a smart contract that changes state
   * @param params Parameters for the contract execution
   */
  async executeContract(
    params: ContractExecuteParams
  ): Promise<{ transactionHash: string }> {
    if (!this.contractService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    
    const result = await this.contractService.executeContract(params);
    
    return {
      transactionHash: result.transactionHash
    };
  }

  /**
   * Get all DEX pools
   */
  async getPools(): Promise<PoolInfo[]> {
    if (!this.dexService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.dexService.getPools();
  }

  /**
   * Find swap routes between two tokens
   */
  async findSwapRoutes(tokenInDenom: string, tokenOutDenom: string): Promise<SwapOperation[][]> {
    if (!this.dexService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.dexService.findRoutes(tokenInDenom, tokenOutDenom);
  }

  /**
   * Simulate a token swap
   */
  async simulateSwap(params: SwapParams): Promise<{ expectedReturn: string, routes: SwapOperation[] }> {
    if (!this.dexService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.dexService.simulateSwap(params);
  }

  /**
   * Execute a token swap
   */
  async swap(params: SwapParams): Promise<TransactionResponse> {
    if (!this.dexService) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.dexService.swap(params);
  }
}
