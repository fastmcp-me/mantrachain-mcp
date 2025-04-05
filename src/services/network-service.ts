import { BaseService } from './base-service.js';

export class NetworkService extends BaseService {
  /**
   * Get the current address information
   */
  async getCurrentAddressInfo() {
    return {
      address: this.address,
      network: this.network,
      explorerUrl: `${this.network.explorerUrl}/address/${this.address}`,
    };
  }

  /**
   * Get the block information
   */
  async getBlockInfo(height?: number) {
    try {
      const blockData = height ? await this.cometClient.block(height) : await this.cometClient.block();
      // Extract the most useful information
      return {
        height: blockData.block.header.height,
        time: blockData.block.header.time.toISOString(),
        chainId: blockData.block.header.chainId,
        numTxs: blockData.block.txs?.length || 0,
        proposer: Buffer.from(blockData.block.header.proposerAddress).toString('hex').toUpperCase(),
        appHash: Buffer.from(blockData.block.header.appHash).toString('hex').toUpperCase(),
      };
    } catch (error) {
      throw new Error(`Failed to get current block info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
