import { ChainIdToAddress, Network } from "../utils";

export const Exchange: ChainIdToAddress = {
  [Network.Optimism]: "0x11c9e50dfde606a864a25726d174faf947626f3d",
  [Network.Arbitrum]: "0x1a7b46c660603ebb5fbe3ae51e80ad21df00bdd1",
  [Network.zkEVM]: "0x1a7b46c660603ebb5fbe3ae51e80ad21df00bdd1",
  [Network.zkSync]: "0xf7Ce7998B4c8aFc97a15c32E724ae2C0D0F90F73"
};
