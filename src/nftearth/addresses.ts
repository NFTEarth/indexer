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
  [Network.EthereumGoerli]: "0x601d58906d22ce2fabdfb112e15e515557aa191c",
};

export const OpenseaConduitKey: ChainIdToAddress = {
  [Network.Optimism]: "CD0B087E113152324FCA962488B4D9BEB6F4CAF6F100000000000000000000F1",
};

export const OpenseaConduit: ChainIdToAddress = {
  [Network.Optimism]: "0xfa29f9a402157672c2f608d193526a00c6b429af",
};
