import { Interface } from "@ethersproject/abi";
import { Log } from "@ethersproject/abstract-provider";
import { Contract } from "@ethersproject/contracts";
import * as Sdk from "@reservoir0x/sdk";
import { bn } from "@/common/utils";
import { baseProvider } from "@/common/provider";
import { config } from "@/config/index";
import * as nftx from "@/events-sync/data/nftx";
import {
  getNftxFtPool,
  getNftxNftPool,
  saveNftxFtPool,
  saveNftxNftPool,
} from "@/models/nftx-pools";
import { formatEther, parseEther } from "@ethersproject/units";
import { logger } from "@/common/logger";
import { BigNumber } from "ethers";

export const getNftPoolDetails = async (address: string) =>
  getNftxNftPool(address).catch(async () => {
    if (Sdk.Nftx.Addresses.VaultFactory[config.chainId]) {
      const iface = new Interface([
        "function assetAddress() view returns (address)",
        "function vaultId() view returns (uint256)",
        "function vault(uint256) view returns (address)",
      ]);

      try {
        const pool = new Contract(address, iface, baseProvider);

        const nft = await pool.assetAddress();
        const vaultId = await pool.vaultId();

        const factory = new Contract(
          Sdk.Nftx.Addresses.VaultFactory[config.chainId],
          iface,
          baseProvider
        );
        if ((await factory.vault(vaultId)).toLowerCase() === address) {
          return saveNftxNftPool({
            address,
            nft,
            vaultId: vaultId.toString(),
          });
        }
      } catch {
        // Skip any errors
      }
    }
  });

export const getFtPoolDetails = async (address: string) =>
  getNftxFtPool(address).catch(async () => {
    if (Sdk.Nftx.Addresses.VaultFactory[config.chainId]) {
      const iface = new Interface([
        "function token0() view returns (address)",
        "function token1() view returns (address)",
      ]);

      try {
        const pool = new Contract(address, iface, baseProvider);

        const token0 = await pool.token0();
        const token1 = await pool.token1();

        return saveNftxFtPool({
          address,
          token0,
          token1,
        });
      } catch {
        // Skip any errors
      }
    }
  });

export const isMint = (log: Log, address: string) => {
  if (
    log.topics[0] === nftx.minted.abi.getEventTopic("Minted") &&
    log.address.toLowerCase() === address
  ) {
    return true;
  }
};

export const isRedeem = (log: Log, address: string) => {
  if (
    log.topics[0] === nftx.redeemed.abi.getEventTopic("Redeemed") &&
    log.address.toLowerCase() === address
  ) {
    return true;
  }
};

export const isUserStake = (log: Log) => {
  if (
    log.topics[0] === nftx.staked.abi.getEventTopic("UserStaked")
    // && log.address.toLowerCase() === address
  ) {
    return true;
  }
};

const ifaceUniV2 = new Interface([
  `event Swap(
    address indexed sender,
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out,
    address indexed to
  )`,
]);
const ifaceUniV3 = new Interface([
  `event Swap(
    address indexed sender,
    address indexed recipient,
    int256 amount0,
    int256 amount1,
    uint160 sqrtPriceX96,
    uint128 liquidity,
    int24 tick
  )`,
]);

export const isSwap = (log: Log) => {
  if (
    [ifaceUniV2.getEventTopic("Swap"), ifaceUniV3.getEventTopic("Swap")].includes(log.topics[0])
  ) {
    return true;
  }
  return false;
};

export const tryParseSwap = async (log: Log) => {
  // We only support parsing UniswapV2-like swaps for now

  // TODO: Add support for UniswapV3-like swaps and multi-swaps
  // (eg. https://etherscan.io/tx/0x04cc2def87437c608f743ab0bfe90d4a80997cd7e6c0503e6472bb3dd084a167)

  if (log.topics[0] === ifaceUniV2.getEventTopic("Swap")) {
    const ftPool = await getFtPoolDetails(log.address.toLowerCase());
    if (ftPool) {
      const parsedLog = ifaceUniV2.parseLog(log);
      return {
        ftPool,
        amount0In: parsedLog.args["amount0In"].toString(),
        amount1In: parsedLog.args["amount1In"].toString(),
        amount0Out: parsedLog.args["amount0Out"].toString(),
        amount1Out: parsedLog.args["amount1Out"].toString(),
      };
    }
  }
};

export async function getPoolPrice(vault: string, amount = 1) {
  let buyPrice = null;
  let sellPrice = null;
  let randomBuyPrice = null;

  const iface = new Interface([
    "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
    "function getAmountsIn(uint amountOut, address[] memory path) view returns (uint[] memory amounts)",
  ]);

  const WETH = Sdk.Common.Addresses.Weth[config.chainId];
  const sushiRouterAddr = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

  const sushiRouter = new Contract(sushiRouterAddr, iface, baseProvider);

  try {
    const path = [WETH, vault];
    const amounts = await sushiRouter.getAmountsIn(parseEther(`${amount}`), path);
    buyPrice = formatEther(amounts[0]);
  } catch (error) {
    logger.error("get-nftx-pool-price", `Failed to getAmountsIn: ${error}`);
  }

  try {
    const path = [vault, WETH];
    const amounts = await sushiRouter.getAmountsOut(parseEther(`${amount}`), path);
    sellPrice = formatEther(amounts[1]);
  } catch (error) {
    logger.error("get-nftx-pool-price", `Failed to getAmountsOut: ${error}`);
  }

  const fees = await getPoolFees(vault);
  const base = parseEther(`1`);
  let feeBpsSell = null;
  let feeBpsBuy = null;
  let feeBpsRandomBuy = null;

  if (sellPrice) {
    const price = parseEther(sellPrice).div(bn(amount));
    const mintFeeInETH = bn(fees.mintFee).mul(price).div(base);

    sellPrice = formatEther(price.sub(mintFeeInETH));
    feeBpsSell = mintFeeInETH.mul(bn(10000)).div(parseEther(sellPrice)).toString();
  }

  if (buyPrice) {
    // 1 ETH = x Vault Token
    const price = parseEther(buyPrice).div(bn(amount));
    const targetBuyFeeInETH = bn(fees.targetRedeemFee).mul(price).div(base);
    const randomBuyFeeInETH = bn(fees.randomRedeemFee).mul(price).div(base);

    buyPrice = formatEther(price.add(targetBuyFeeInETH));
    randomBuyPrice = formatEther(price.add(randomBuyFeeInETH));
    feeBpsBuy = targetBuyFeeInETH.mul(bn(10000)).div(parseEther(buyPrice)).toString();
    feeBpsRandomBuy = randomBuyFeeInETH.mul(bn(10000)).div(parseEther(randomBuyPrice)).toString();
  }

  return {
    fees,
    amount,
    bps: {
      sell: feeBpsSell,
      buy: feeBpsBuy,
      randomBuy: feeBpsRandomBuy,
    },
    currency: WETH,
    sell: sellPrice,
    buy: buyPrice,
    buyRandom: randomBuyPrice,
  };
}

export async function getPoolNFTs(vault: string) {
  const tokenIds: string[] = [];
  const iface = new Interface(["function allHoldings() external view returns (uint256[] memory)"]);

  const factory = new Contract(vault, iface, baseProvider);
  try {
    const holdingNFTs = await factory.allHoldings();
    holdingNFTs.forEach((c: BigNumber) => {
      tokenIds.push(c.toString());
    });
  } catch {
    // Skip errors
  }
  return tokenIds;
}

// TODO store fees to database
export async function getPoolFees(address: string) {
  const iface = new Interface([
    "function mintFee() public view returns (uint256)",
    "function targetRedeemFee() public view returns (uint256)",
    "function randomRedeemFee() public view returns (uint256)",
  ]);

  const vault = new Contract(address, iface, baseProvider);

  const [mintFee, targetRedeemFee, randomRedeemFee] = await Promise.all([
    vault.mintFee(),
    vault.targetRedeemFee(),
    vault.randomRedeemFee(),
  ]);

  return {
    mintFee: mintFee.toString(),
    randomRedeemFee: randomRedeemFee.toString(),
    targetRedeemFee: targetRedeemFee.toString(),
  };
}
