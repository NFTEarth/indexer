import { Network, ChainIdToAddress } from "@reservoir0x/sdk/dist/utils";

export const Exchange: ChainIdToAddress = {
  [Network.Optimism]: "0x0f9b80fc3c8b9123d0aef43df58ebdbc034a8901",
  //[Network.Arbitrum]: "0x00000000006c3852cbef3e08e8df289169ede581",
};

export const ConduitController: ChainIdToAddress = {
  [Network.Optimism]: "0x3E173b825ADEeF9661920B91A8d50B075Ad51bA5",
  //[Network.Arbitrum]: "0x00000000f9490004c11cef243f5400493c00ad63",
};

export const PausableZone: ChainIdToAddress = {
  [Network.Ethereum]: "0x004c00500000ad104d7dbd00e3ae0a5c00560c00",
  [Network.Polygon]: "0x004c00500000ad104d7dbd00e3ae0a5c00560c00",
};

export const ApprovalOrderZone: ChainIdToAddress = {
  [Network.EthereumGoerli]: "0x5595ddec926bfb297814c33a90e44f97c6074fe5",
};

export const CancelXZone: ChainIdToAddress = {
  [Network.EthereumGoerli]: "0x0f9b80fc3c8b9123D0aEf43Df58ebDBC034A8901",
};

export const SeaportConduitKey: ChainIdToAddress = {
  [Network.Optimism]: "0xcd0b087e113152324fca962488b4d9beb6f4caf6f100000000000000000000f1",
};

export const SeaportConduit: ChainIdToAddress = {
  [Network.Optimism]: "0xFA29f9A402157672C2F608d193526A00C6B429Af",
};
