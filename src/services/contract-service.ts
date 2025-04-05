import { SigningStargateClient, QueryClient, StakingExtension, DistributionExtension } from '@cosmjs/stargate';
import { JsonObject, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { NetworkConfig } from '../config.js';
import { Comet38Client } from '@cosmjs/tendermint-rpc';
import { BaseService } from './base-service.js';
import { TransactionResponse } from '../types.js';

export interface ContractQueryParams {
  contractAddress: string;
  queryMsg: JsonObject;
}

export interface ContractExecuteParams {
  contractAddress: string;
  executeMsg: JsonObject;
  funds?: Array<{ denom: string; amount: string }>;
  memo?: string;
}

export class ContractService extends BaseService {
  constructor(
    stargateClient: SigningStargateClient,
    wasmClient: SigningCosmWasmClient,
    queryClient: QueryClient & StakingExtension & DistributionExtension,
    cometClient: Comet38Client,
    address: string,
    network: NetworkConfig
  ) {
    super(stargateClient, wasmClient, queryClient, cometClient, address, network);
  }

  /**
   * Query a smart contract by executing a read-only function
   * @param params The contract query parameters
   * @returns The query result from the contract
   */
  async queryContract(params: ContractQueryParams): Promise<any> {
    const { contractAddress, queryMsg } = params;

    try {
      // CosmWasmClient queryContractSmart method is used for smart contract queries
      const result = await this.wasmClient.queryContractSmart(contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error('Error querying contract:', error);
      throw error;
    }
  }

  /**
   * Execute a function on a smart contract that changes state
   * @param params The contract execution parameters
   * @returns The transaction result containing the hash
   */
  async executeContract(params: ContractExecuteParams): Promise<TransactionResponse> {
    const { contractAddress, executeMsg, funds, memo } = params;

    try {
      // The execute method sends a transaction to invoke a smart contract
      const result = await this.wasmClient.execute(
        this.address,
        contractAddress,
        executeMsg,
        'auto',
        memo,
        funds
      );
      
      return {
        transactionHash: result.transactionHash,
        success: true,
        explorerUrl: `${this.network.explorerUrl}/tx/${result.transactionHash}`,
        gasUsed: result.gasUsed.toString(),
        gasWanted: result.gasWanted.toString(),
      };
    } catch (error) {
      console.error('Error executing contract:', error);
      throw error;
    }
  }
}
