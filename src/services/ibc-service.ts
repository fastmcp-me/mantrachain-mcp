import { Coin } from '@cosmjs/proto-signing';
import { MsgTransferEncodeObject } from '@cosmjs/stargate';
import { BaseService } from './base-service.js';
import { TransactionResponse } from '../types.js';
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx.js";
import { Height } from "cosmjs-types/ibc/core/client/v1/client.js";

export interface IBCTransferParams {
  recipientAddress: string;
  transferAmount: Coin,
  sourcePort?: string,
  sourceChannel: string;
  timeoutHeight?: Height
  /** timeout in seconds */
  timeoutTimestamp?: number,
  ibcMemo?: string;
  memo?: string;
}


export class IBCService extends BaseService {
  /**
   * Send tokens via IBC
   */
  async sendIBCTransfer({
    recipientAddress,
    transferAmount,
    sourcePort = 'transfer',
    sourceChannel,
    timeoutHeight,
    timeoutTimestamp,
    ibcMemo = '',
    memo = ''
  }: IBCTransferParams): Promise<TransactionResponse> {    
    try {
      if (!timeoutHeight && !timeoutTimestamp) {
        const now = new Date();
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
        timeoutTimestamp = Math.floor(tenMinutesFromNow.getTime() / 1000);
      }

      const timeoutTimestampNanoseconds = timeoutTimestamp
      ? BigInt(timeoutTimestamp) * BigInt(1_000_000_000)
      : undefined;

      if (recipientAddress === this.address) {
        throw new Error('Recipient address cannot be the same as sender address');
      }

      const transferMsg: MsgTransferEncodeObject = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: MsgTransfer.fromPartial({
          sourcePort: sourcePort,
          sourceChannel: sourceChannel,
          sender: this.address,
          receiver: recipientAddress,
          token: transferAmount,
          timeoutHeight: timeoutHeight,
          timeoutTimestamp: timeoutTimestampNanoseconds,
          memo: ibcMemo
        })
      };

      const result = await this.stargateClient.signAndBroadcast(this.address, [transferMsg], 'auto', memo);
      return {
        transactionHash: result.transactionHash,
        explorerUrl: `${this.network.explorerUrl}/tx/${result.transactionHash}`,
        success: result.code === 0,
        gasUsed: result.gasUsed.toString(),
        gasWanted: result.gasWanted.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to execute IBC transfer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
