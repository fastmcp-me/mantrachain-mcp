import { Coin } from '@allthatjazzleo/proto-signing';
import { BaseService } from './base-service.js';
import { TransactionResponse } from '../types.js';

export interface BankSendParams {
  recipientAddress: string;
  coins: Coin[];
  memo?: string;
}

export class BankService extends BaseService {
  /**
   * Send tokens to another address
   */
  async sendTokens({
    recipientAddress,
    coins,
    memo = ''
  }: BankSendParams): Promise<TransactionResponse> {
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
        gasWanted: result.gasWanted.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to send tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Query account balance
   */
  async getBalance(address?: string) {
    const targetAddress = address || this.address;
    if (!targetAddress) {
      throw new Error('No address provided and no default address set.');
    }

    try {
      const balances = await this.stargateClient.getAllBalances(targetAddress);
      return {
        balances: balances,
        explorerUrl: `${this.network.explorerUrl}/address/${targetAddress}`,
      };
    } catch (error) {
      throw new Error(`Failed to query balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
