import { SigningStargateClient, QueryClient, StakingExtension, DistributionExtension } from '@cosmjs/stargate';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Comet38Client } from '@cosmjs/tendermint-rpc';
import { NetworkConfig } from '../config.js';

export class BaseService {
  protected stargateClient: SigningStargateClient;
  protected wasmClient: SigningCosmWasmClient;
  protected queryClient: QueryClient & StakingExtension & DistributionExtension;
  protected cometClient: Comet38Client;
  protected address: string;
  protected network: NetworkConfig;

  constructor(
    stargateClient: SigningStargateClient,
    wasmClient: SigningCosmWasmClient,
    queryClient: QueryClient & StakingExtension & DistributionExtension,
    cometClient: Comet38Client,
    address: string,
    network: NetworkConfig
  ) {
    this.stargateClient = stargateClient;
    this.wasmClient = wasmClient;
    this.queryClient = queryClient;
    this.cometClient = cometClient;
    this.address = address;
    this.network = network;
  }
}
