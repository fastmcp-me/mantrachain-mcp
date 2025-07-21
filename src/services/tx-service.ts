import { EncodeObject } from '@allthatjazzleo/proto-signing';
import { BaseService } from './base-service.js';
import { TransactionResponse } from '../types.js';

export class TxService extends BaseService {
  /**
   * Sign and broadcast a transaction
   * @param messages A single message or array of messages to broadcast
   * @param memo Optional memo to include with the transaction
   */
  async signAndBroadcast(messages: EncodeObject[], memo = ''): Promise<TransactionResponse> {
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
