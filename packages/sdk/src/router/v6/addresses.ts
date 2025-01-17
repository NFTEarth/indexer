import { ChainIdToAddress, Network } from "../../utils";

// Router

// V6_0_0
export const Router: ChainIdToAddress = {
  [Network.Ethereum]: "0x178a86d36d89c7fdebea90b739605da7b131ff6a",
  [Network.EthereumGoerli]: "0xb35d22a4553ab9d2b85e2a606cbae55f844df50c",
  [Network.Polygon]: "0x7c173d178B437287608d6105886DdC77CD40c089",
  [Network.Optimism]: "0x7c173d178B437287608d6105886DdC77CD40c089",
  [Network.Arbitrum]: "0x7c173d178B437287608d6105886DdC77CD40c089",
};

// Utility modules

export const WETHModule: ChainIdToAddress = {
  [Network.Ethereum]: "0xe2537569b2f5c320db0c5b2510728d8de0da28e0",
  [Network.EthereumGoerli]: "0x5282b9af3f38d4a5d1bb707f5d3acbd951950074",
  [Network.Polygon]: "0x9a98786764e579aa0fe00947f56d29d5cc601eaa",
  [Network.Optimism]: "0x708a1e6fd3bb995788c26fbcb418f85b1e952df0",
};

export const Permit2Module: ChainIdToAddress = {
  [Network.Ethereum]: "0x482e4d362c8a2ea19e07b7234a14084a7d740b42",
  [Network.Polygon]: "0x5db9abb17333f6eb12386eda955d6fc779bd78f4",
  [Network.Optimism]: "0xc10d7937a42865d9355384b884f7d694c15e7781",
};

export const UniswapV3Module: ChainIdToAddress = {
  [Network.Ethereum]: "0xe5ee6a6e8d57d1d315d1898c68ea1bc487b6ea92",
  [Network.EthereumGoerli]: "0x6748fce2eabad140b36dc7300ad2eb31631410be",
  [Network.Polygon]: "0x5f78d53122f88f3abbed88090e1648b5f9f824bd",
  [Network.Optimism]: "0x9ebf2302ab53a2357dd4d802698aac361b956954",
};

// Exchange modules

export const BlurModule: ChainIdToAddress = {
  [Network.Ethereum]: "0xb1096516fc33bb64a77158b10f155846e74bd7fa",
};

export const FoundationModule: ChainIdToAddress = {
  [Network.Ethereum]: "0x5c8a351d4ff680203e05af56cb9d748898c7b39a",
};

export const LooksRareModule: ChainIdToAddress = {
  [Network.Ethereum]: "0x385df8cbc196f5f780367f3cdc96af072a916f7e",
  [Network.EthereumGoerli]: "0x532486bb46581b032134159c1d31962cdab1e6a7",
};

export const SeaportModule: ChainIdToAddress = {
  [Network.Ethereum]: "0x20794ef7693441799a3f38fcc22a12b3e04b9572",
  [Network.EthereumGoerli]: "0x04c3af2cad3d1c037930184161ec24ba3a631129",
  [Network.Polygon]: "0xe225afd0b78a265a60ccaeb1c1310e0016716e7b",
  [Network.Optimism]: "0x51e59caf8980d4284707daa2267ec4cc05f48374",
};

export const SeaportV14Module: ChainIdToAddress = {
  [Network.Ethereum]: "0xfb3f14829f15b1303d6ca677e3fae5a558e064d1",
  [Network.EthereumGoerli]: "0x9ec973b9471fd632aee6d67e0c74855d115bdbad",
  [Network.Polygon]: "0xe37fc9756307dc29767f7952664d9f81b00c07b6",
  [Network.Optimism]: "0x955a3019b4662dcb68d6cc71f198faf1f64c1bf9",
};

export const NFTEarthModule: ChainIdToAddress = {
  [Network.Optimism]: "0x2140Ea50bc3B6Ac3971F9e9Ea93A1442665670e4",
  [Network.Arbitrum]: "0x2140Ea50bc3B6Ac3971F9e9Ea93A1442665670e4",
  [Network.Optimism]: "0x2140Ea50bc3B6Ac3971F9e9Ea93A1442665670e4",
};

export const SudoswapModule: ChainIdToAddress = {
  [Network.Ethereum]: "0x79abbfdf20fc6dd0c51693bf9a481f7351a70fd2",
};

export const X2Y2Module: ChainIdToAddress = {
  [Network.Ethereum]: "0x613d3c588f6b8f89302b463f8f19f7241b2857e2",
  [Network.EthereumGoerli]: "0x6a789513b2e555f9d3539bf9a053a57d2bfca426",
};

export const ZeroExV4Module: ChainIdToAddress = {
  [Network.Ethereum]: "0x8162beec776442afd262b672730bb5d0d8af16a1",
  [Network.EthereumGoerli]: "0x29fcac61d9b2a3c55f3e1149d0278126c31abe74",
};

export const ZoraModule: ChainIdToAddress = {
  [Network.Ethereum]: "0x982b49de82a3ea5b8c42895482d9dd9bfefadf82",
};

export const ElementModule: ChainIdToAddress = {
  [Network.Ethereum]: "0xef82b43719dd13ba33ef7d93e6f0d1f690eea5b2",
};

export const NFTXModule: ChainIdToAddress = {
  [Network.Ethereum]: "0x27eb35119dda39df73db6681019edc4c16311acc",
};

export const RaribleModule: ChainIdToAddress = {
  [Network.Ethereum]: "0xa29d7914cd525dea9afad0dceec6f49404476486",
};
