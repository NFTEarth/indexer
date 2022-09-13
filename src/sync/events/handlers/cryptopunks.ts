import { Interface } from "@ethersproject/abi";
import { AddressZero } from "@ethersproject/constants";
import { keccak256 } from "@ethersproject/solidity";
import * as Sdk from "@reservoir0x/sdk";

import { config } from "@/config/index";
import { getEventData } from "@/events-sync/data";
import { EnhancedEvent, OnChainData } from "@/events-sync/handlers/utils";
import * as es from "@/events-sync/storage";
import * as utils from "@/events-sync/utils";
import * as cryptopunks from "@/orderbook/orders/cryptopunks";
import { getUSDAndNativePrices } from "@/utils/prices";

import * as fillUpdates from "@/jobs/fill-updates/queue";
import * as orderUpdatesById from "@/jobs/order-updates/by-id-queue";
import * as tokenUpdatesMint from "@/jobs/token-updates/mint-queue";

export const handleEvents = async (events: EnhancedEvent[]): Promise<OnChainData> => {
  const cancelEventsOnChain: es.cancels.Event[] = [];
  const fillEventsOnChain: es.fills.Event[] = [];
  const nftTransferEvents: es.nftTransfers.Event[] = [];

  const fillInfos: fillUpdates.FillInfo[] = [];
  const mintInfos: tokenUpdatesMint.MintInfo[] = [];
  const orderInfos: orderUpdatesById.OrderInfo[] = [];

  // Keep track of any on-chain orders
  const orders: cryptopunks.OrderInfo[] = [];

  // Keep track of any Cryptopunks transfers (for working around a contract bug)
  const transfers: {
    to: string;
    txHash: string;
  }[] = [];

  // Handle the events
  for (const { kind, baseEventParams, log } of events) {
    const eventData = getEventData([kind])[0];
    switch (kind) {
      case "cryptopunks-punk-offered": {
        const parsedLog = eventData.abi.parseLog(log);
        const tokenId = parsedLog.args["punkIndex"].toString();
        const price = parsedLog.args["minValue"].toString();
        const taker = parsedLog.args["toAddress"].toLowerCase();

        orders.push({
          orderParams: {
            maker: (await utils.fetchTransaction(baseEventParams.txHash)).from.toLowerCase(),
            side: "sell",
            tokenId,
            price,
            taker: taker !== AddressZero ? taker : undefined,
            txHash: baseEventParams.txHash,
            txTimestamp: baseEventParams.timestamp,
          },
          metadata: {},
        });

        break;
      }

      case "cryptopunks-punk-no-longer-for-sale": {
        const parsedLog = eventData.abi.parseLog(log);
        const tokenId = parsedLog.args["punkIndex"].toString();

        // TODO: Order id generation should belong in the orderbook logic
        const orderId = keccak256(["string", "uint256"], ["cryptopunks", tokenId]);

        cancelEventsOnChain.push({
          orderKind: "cryptopunks",
          orderId,
          baseEventParams,
        });

        orderInfos.push({
          context: `cancelled-${orderId}-${baseEventParams.txHash}`,
          id: orderId,
          trigger: {
            kind: "cancel",
            txHash: baseEventParams.txHash,
            txTimestamp: baseEventParams.timestamp,
            logIndex: baseEventParams.logIndex,
            batchIndex: baseEventParams.batchIndex,
            blockHash: baseEventParams.blockHash,
          },
        });

        break;
      }

      case "cryptopunks-punk-bought": {
        const { args } = eventData.abi.parseLog(log);
        const tokenId = args["punkIndex"].toString();
        let value = args["value"].toString();
        const fromAddress = args["fromAddress"].toLowerCase();
        let toAddress = args["toAddress"].toLowerCase();

        // Due to an upstream issue with the Punks contract, the `PunkBought`
        // event is emitted with zeroed `toAddress` and `value` fields when a
        // bid acceptance transaction is triggered. See the following issue:
        // https://github.com/larvalabs/cryptopunks/issues/19

        // To work around this, we get the correct `toAddress` from the most
        // recent `Transfer` event which includes the correct taker
        if (transfers.length && transfers[transfers.length - 1].txHash === baseEventParams.txHash) {
          toAddress = transfers[transfers.length - 1].to;
        }

        // To get the correct price that the bid was settled at we have to
        // parse the transaction's calldata and extract the `minPrice` arg
        // where applicable (if the transaction was a bid acceptance one)
        const tx = await utils.fetchTransaction(baseEventParams.txHash);
        const iface = new Interface(["function acceptBidForPunk(uint punkIndex, uint minPrice)"]);
        try {
          const result = iface.decodeFunctionData("acceptBidForPunk", tx.data);
          value = result.minPrice.toString();
        } catch {
          // Skip any errors
        }

        const orderSide = toAddress === AddressZero ? "buy" : "sell";
        const maker = orderSide === "sell" ? fromAddress : toAddress;
        let taker = orderSide === "sell" ? toAddress : fromAddress;

        // Handle: attribution

        const orderKind = "cryptopunks";
        const attributionData = await utils.extractAttributionData(
          baseEventParams.txHash,
          orderKind
        );
        if (attributionData.taker) {
          taker = attributionData.taker;
        }

        // Handle: prices

        const priceData = await getUSDAndNativePrices(
          Sdk.Common.Addresses.Eth[config.chainId],
          value,
          baseEventParams.timestamp
        );
        if (!priceData.nativePrice) {
          // We must always have the native price
          break;
        }

        nftTransferEvents.push({
          kind: "cryptopunks",
          from: fromAddress,
          to: toAddress,
          tokenId,
          amount: "1",
          baseEventParams,
        });

        // TODO: Order id generation should belong in the orderbook logic
        const orderId = keccak256(["string", "uint256"], ["cryptopunks", tokenId]);

        fillEventsOnChain.push({
          orderId,
          orderKind,
          orderSide,
          maker,
          taker,
          price: priceData.nativePrice,
          currencyPrice: value,
          usdPrice: priceData.usdPrice,
          currency: Sdk.Common.Addresses.Eth[config.chainId],
          contract: baseEventParams.address?.toLowerCase(),
          tokenId,
          amount: "1",
          orderSourceId: attributionData.orderSource?.id,
          aggregatorSourceId: attributionData.aggregatorSource?.id,
          fillSourceId: attributionData.fillSource?.id,
          baseEventParams,
        });

        orderInfos.push({
          context: `filled-${orderId}-${baseEventParams.txHash}`,
          id: orderId,
          trigger: {
            kind: "sale",
            txHash: baseEventParams.txHash,
            txTimestamp: baseEventParams.timestamp,
          },
        });

        fillInfos.push({
          context: orderId,
          orderId: orderId,
          orderSide: "sell",
          contract: Sdk.CryptoPunks.Addresses.Exchange[config.chainId],
          tokenId,
          amount: "1",
          price: priceData.nativePrice,
          timestamp: baseEventParams.timestamp,
        });

        break;
      }

      case "cryptopunks-punk-transfer": {
        const { args } = eventData.abi.parseLog(log);
        const from = args["from"].toLowerCase();
        const to = args["to"].toLowerCase();
        const tokenId = args["punkIndex"].toString();

        nftTransferEvents.push({
          kind: "cryptopunks",
          from,
          to,
          tokenId,
          amount: "1",
          baseEventParams,
        });

        break;
      }

      case "cryptopunks-assign": {
        const { args } = eventData.abi.parseLog(log);
        const to = args["to"].toLowerCase();
        const tokenId = args["punkIndex"].toLowerCase();

        nftTransferEvents.push({
          kind: "cryptopunks",
          from: AddressZero,
          to,
          tokenId,
          amount: "1",
          baseEventParams,
        });

        mintInfos.push({
          contract: baseEventParams.address,
          tokenId,
          mintedTimestamp: baseEventParams.timestamp,
        });

        break;
      }

      case "cryptopunks-transfer": {
        const { args } = eventData.abi.parseLog(log);
        const to = args["to"].toLowerCase();

        transfers.push({
          to,
          txHash: baseEventParams.txHash,
        });

        break;
      }
    }
  }

  return {
    fillEventsOnChain,
    cancelEventsOnChain,
    nftTransferEvents,

    fillInfos,
    orderInfos,
    mintInfos,

    orders: orders.map((info) => ({
      kind: "cryptopunks",
      info,
    })),
  };
};
