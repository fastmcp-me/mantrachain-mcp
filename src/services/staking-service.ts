import { Coin } from '@allthatjazzleo/proto-signing';
import { BaseService } from './base-service.js';
import { TransactionResponse } from '../types.js';

export interface StakeParams {
  operatorAddress: string;
  amount: string;
  denom?: string;
  memo?: string;
}

export interface UndelegateParams {
  operatorAddress: string;
  amount: string;
  denom?: string;
  memo?: string;
}

export interface ClaimRewardsParams {
  operatorAddress: string;
  memo?: string;
}

export class StakingService extends BaseService {
  /**
   * Get all validators on the network
   */
  async getValidators() {
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
   * Get all delegations for a specific address
   */
  async getDelegations(address?: string) {
    try {
      const delegatorAddress = address || this.address;
      const response = await this.queryClient.staking.delegatorDelegations(delegatorAddress);
      return response.delegationResponses;
    } catch (error) {
      throw new Error(`Failed to fetch delegations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all available rewards for a specific address
   */
  async getAvailableRewards(address?: string) {
    try {
      const delegatorAddress = address || this.address;
      const response = await this.queryClient.distribution.delegationTotalRewards(delegatorAddress);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch available rewards: ${error instanceof Error ? error.message : String(error)}`);
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
   * Undelegate tokens from a validator
   */
  async undelegateTokens({
    operatorAddress,
    amount,
    denom,
    memo = ''
  }: UndelegateParams): Promise<TransactionResponse> {    
    denom = denom || this.network.denom;

    // Handle display denom conversion if needed
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
      const result = await this.stargateClient.undelegateTokens(
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
      throw new Error(`Failed to undelegate tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Claim rewards for a specific validator
   * @param operatorAddress Address of the validator
   * @param memo Optional memo for the transaction
   */
  async claimRewards({
    operatorAddress,
    memo = ''
  }: ClaimRewardsParams): Promise<TransactionResponse> {
    try {
      const result = await this.wasmClient.withdrawRewards(
        this.address,
        operatorAddress,
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
      throw new Error(`Failed to claim rewards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

}
