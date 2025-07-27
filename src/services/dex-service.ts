import { Coin } from '@allthatjazzleo/proto-signing';
import { BaseService } from './base-service.js';
import { TransactionResponse } from '../types.js';

export interface SwapParams {
  tokenIn: Coin;
  tokenOutDenom: string;
  slippage?: string; // percentage (e.g. "1" for 1%)
  memo?: string;
}

export interface MantraSwap {
  pool_identifier: string;
  token_in_denom: string;
  token_out_denom: string;
}

export interface SwapOperation {
  mantra_swap: MantraSwap;
}

export interface PoolInfo {
  pool_info: {
    pool_identifier: string;
    asset_denoms: string[];
    lp_denom: string;
    asset_decimals: number[];
    assets: {
      denom: string;
      amount: string;
    }[];
    pool_type: string | { stable_swap: { amp: number } };
    pool_fees: {
      protocol_fee: { share: string };
      swap_fee: { share: string };
      burn_fee: { share: string };
      extra_fees: any[];
    };
  };
  total_share: {
    denom: string;
    amount: string;
  };
}

export class DexService extends BaseService {
  private getDexContractAddress(): string {
    // Return appropriate contract address based on the network
    // throw an error if not found
    if (!this.network.dexContractAddress) {
      throw new Error('DEX contract address not found for the current network');
    }
    return this.network.dexContractAddress;
  }

  /**
   * Get all pools from the DEX
   */
  async getPools(): Promise<PoolInfo[]> {
    try {
      const contractAddress = this.getDexContractAddress();
      const response = await this.wasmClient.queryContractSmart(contractAddress, { 
        pools: {} 
      });
      return response.pools;
    } catch (error) {
      throw new Error(`Failed to get pools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find swap routes between two tokens
   */
  async findRoutes(tokenInDenom: string, tokenOutDenom: string): Promise<SwapOperation[][]> {
    try {
      const pools = await this.getPools();
      
      // Check for direct routes (single pool swaps)
      const directPools = pools.filter(pool => {
        const denoms = pool.pool_info.asset_denoms;
        return denoms.includes(tokenInDenom) && denoms.includes(tokenOutDenom);
      });

      const directRoutes = directPools.map(pool => [{
        mantra_swap: {
          pool_identifier: pool.pool_info.pool_identifier,
          token_in_denom: tokenInDenom,
          token_out_denom: tokenOutDenom
        }
      }]);

      if (directRoutes.length > 0) {
        return directRoutes;
      }

      // Find multi-hop routes (2-hop routes only for simplicity)
      const multiHopRoutes = [];
      
      const poolsWithTokenIn = pools.filter(pool => 
        pool.pool_info.asset_denoms.some(denom => denom === tokenInDenom)
      );

      const poolsWithTokenOut = pools.filter(pool => 
        pool.pool_info.asset_denoms.some(denom => denom === tokenOutDenom)
      );

      for (const inPool of poolsWithTokenIn) {
        const inPoolDenoms = inPool.pool_info.asset_denoms;
        
        for (const intermediateToken of inPoolDenoms) {
          if (intermediateToken === tokenInDenom) continue;
          
          const connectedOutPools = poolsWithTokenOut.filter(outPool => 
            outPool.pool_info.asset_denoms.some(denom => denom === intermediateToken)
          );
          
          for (const outPool of connectedOutPools) {
            multiHopRoutes.push([
              {
                mantra_swap: {
                  pool_identifier: inPool.pool_info.pool_identifier,
                  token_in_denom: tokenInDenom,
                  token_out_denom: intermediateToken
                }
              },
              {
                mantra_swap: {
                  pool_identifier: outPool.pool_info.pool_identifier,
                  token_in_denom: intermediateToken,
                  token_out_denom: tokenOutDenom
                }
              }
            ]);
          }
        }
      }
      
      return [...directRoutes, ...multiHopRoutes];
    } catch (error) {
      throw new Error(`Failed to find swap routes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simulate a swap to get the expected return amount
   */
  async simulateSwap(params: SwapParams): Promise<{
    expectedReturn: string;
    routes: SwapOperation[];
  }> {
    try {
      const routes = await this.findRoutes(params.tokenIn.denom, params.tokenOutDenom);
      
      if (routes.length === 0) {
        throw new Error(`No route found for swap from ${params.tokenIn.denom} to ${params.tokenOutDenom}`);
      }

      // Simulate each route and find the best one
      let bestRoute = routes[0];
      let bestReturnAmount = '0';

      for (const route of routes) {
        const contractAddress = this.getDexContractAddress();
        const response = await this.wasmClient.queryContractSmart(contractAddress, {
          simulate_swap_operations: {
            operations: route,
            offer_amount: params.tokenIn.amount
          }
        });

        if (BigInt(response.return_amount) > BigInt(bestReturnAmount)) {
          bestReturnAmount = response.return_amount;
          bestRoute = route;
        }
      }

      return {
        expectedReturn: bestReturnAmount,
        routes: bestRoute
      };
    } catch (error) {
      throw new Error(`Failed to simulate swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a swap between two tokens
   */
  async swap(params: SwapParams): Promise<TransactionResponse> {
    try {
      // First simulate to get the expected return
      const { expectedReturn, routes } = await this.simulateSwap(params);
      
      // Calculate minimum to receive based on slippage
      const slippagePercent = params.slippage ? parseFloat(params.slippage) : 1.0;
      const slippageMultiplier = (100 - slippagePercent) / 100;
      const minToReceive = (BigInt(Math.floor(Number(expectedReturn) * slippageMultiplier))).toString();
      
      // Execute the swap
      const contractAddress = this.getDexContractAddress();
      
      let executeMsg;
      if (routes.length === 1) {
        // Single swap
        executeMsg = {
          swap: {
            ask_asset_denom: params.tokenOutDenom,
            belief_price: null,
            max_spread: `${slippagePercent/100}`,
            pool_identifier: routes[0].mantra_swap.pool_identifier,
            receiver: null
          }
        };
      } else {
        // Multi-hop swap
        executeMsg = {
          execute_swap_operations: {
            max_spread: `${slippagePercent/100}`,
            minimum_receive: minToReceive,
            operations: routes,
            receiver: null
          }
        };
      }
      
      const result = await this.wasmClient.execute(
        this.address,
        contractAddress,
        executeMsg,
        'auto',
        params.memo,
        [params.tokenIn]
      );
      
      return {
        transactionHash: result.transactionHash,
        explorerUrl: `${this.network.explorerUrl}/tx/${result.transactionHash}`,
        success: true,
        gasUsed: result.gasUsed.toString(),
        gasWanted: result.gasWanted.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to execute swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
