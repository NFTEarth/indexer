import { getEventData } from "@/events-sync/data";
import { EnhancedEvent, OnChainData } from "@/events-sync/handlers/utils";
import * as utils from "@/events-sync/utils";
import { getUSDAndNativePrices } from "@/utils/prices";
import { bn } from "@/common/utils";

export const handleEvents = async (events: EnhancedEvent[], onChainData: OnChainData) => {
  // Handle the events
  for (const { subKind, baseEventParams, log } of events) {
    const eventData = getEventData([subKind])[0];
    switch (subKind) {
      case "treasure-sold": {
        const parsedLog = eventData.abi.parseLog(log);

        const tokenId = parsedLog.args["tokenId"].toString();
        const contract = parsedLog.args["nftAddress"].toLowerCase();
        const maker = parsedLog.args["seller"].toLowerCase();
        let taker = parsedLog.args["buyer"].toLowerCase();

        const rawAmount = parsedLog.args["quantity"];
        const price = bn(parsedLog.args["pricePerItem"]).mul(rawAmount).toString();
        const amount = rawAmount.toString();
        const orderSide = "sell";

        // Treasure Exchange works only with MAGIC
        const currency = parsedLog.args["paymentToken"].toLowerCase();

        // Handle: prices
        const priceData = await getUSDAndNativePrices(currency, price, baseEventParams.timestamp);

        if (!priceData.nativePrice) {
          // We must always have the native price
          break;
        }

        // Handle: attribution
        const orderKind = "treasure";
        const data = await utils.extractAttributionData(baseEventParams.txHash, orderKind);
        if (data.taker) {
          taker = data.taker;
        }

        onChainData.fillEvents.push({
          orderKind,
          currency,
          orderSide,
          maker,
          taker,
          price: priceData.nativePrice,
          currencyPrice: price,
          usdPrice: priceData.usdPrice,
          contract,
          tokenId,
          amount,
          orderSourceId: data.orderSource?.id,
          aggregatorSourceId: data.aggregatorSource?.id,
          fillSourceId: data.fillSource?.id,
          baseEventParams,
        });

        onChainData.fillInfos.push({
          context: `treasure-${contract}-${tokenId}-${baseEventParams.txHash}`,
          orderSide,
          contract,
          tokenId,
          amount,
          price: priceData.nativePrice,
          timestamp: baseEventParams.timestamp,
          maker,
          taker,
        });

        break;
      }
      case "treasure-accept-bid": {
        const { args } = eventData.abi.parseLog(log);
        const contract = args["nftAddress"].toLowerCase();
        const maker = args["bidder"].toLowerCase();
        const taker = args["seller"].toLowerCase();
        const currency = args["paymentToken"].toLowerCase();
        const currencyPrice = args["pricePerItem"].mul(args["quantity"]);
        const tokenId = args["_tokenId"].toString();
        const amount = args["quantity"].toString();
        const orderSide = "buy";

        const priceData = await getUSDAndNativePrices(
          currency,
          currencyPrice.toString(),
          baseEventParams.timestamp
        );

        if (!priceData.nativePrice) {
          // We must always have the native price
          break;
        }

        const orderKind = "treasure";
        const attributionData = await utils.extractAttributionData(
          baseEventParams.txHash,
          orderKind
        );

        onChainData.fillEvents.push({
          orderKind,
          currency,
          orderSide,
          maker,
          taker,
          price: priceData.nativePrice,
          currencyPrice,
          usdPrice: priceData.usdPrice,
          contract,
          tokenId,
          amount,
          orderSourceId: attributionData.orderSource?.id,
          aggregatorSourceId: attributionData.aggregatorSource?.id,
          fillSourceId: attributionData.fillSource?.id,
          baseEventParams,
        });

        onChainData.fillInfos.push({
          context: `treasure-${contract}-${tokenId}-${baseEventParams.txHash}`,
          orderSide,
          contract,
          tokenId,
          amount,
          price: priceData.nativePrice,
          timestamp: baseEventParams.timestamp,
          maker,
          taker,
        });

        break;
      }
    }
  }
};
