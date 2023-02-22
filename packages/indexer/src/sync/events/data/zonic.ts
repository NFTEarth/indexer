import { Interface } from "@ethersproject/abi";
import { Zonic } from "@nftearth/sdk";

import { config } from "@/config/index";
import { EventData } from "@/events-sync/data";

// 0xa71c9b7f
export const fulfillBasicOrder: EventData = {
  kind: "zonic",
  subKind: "zonic-order-filled",
  addresses: { [Zonic.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
  topic: "0x31d8f0f884ca359b1c76fda3fd0e25e5f67c2a5082158630f6f3900cb27de467",
  numTopics: 1,
  abi: new Interface([
    `event ZonicBasicOrderFulfilled(
       address offerer,
       address buyer,
       address token,
       uint256 identifier,
       address currency,
       uint256 totalPrice,
       uint256 creatorFee,
       uint256 marketplaceFee,
       address saleId
   );`,
  ]),
};

// 0x7a5dfd3f
export const cancelBasicOrder: EventData = {
  kind: "zonic",
  subKind: "zonic-order-canceled",
  addresses: { [Zonic.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
  topic: "0x880e12946e02965e33664201ca6e0558bef3bd1107e6d7624db838059e8c50af",
  numTopics: 1,
  abi: new Interface([
    `event ZonicBasicOrderCanceled(
        address offerer,
        address token,
        uint256 identifier,
        address saleId
    );`,
  ]),
};
