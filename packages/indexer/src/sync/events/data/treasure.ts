import { Interface } from "@ethersproject/abi";
import { Treasure } from "@nftearth/sdk";

import { config } from "@/config/index";
import { EventData } from "@/events-sync/data";

// 0x2c452098
// export const bidTokenCreatedOrUpdated: EventData = {
//   kind: "treasure",
//   subKind: "treasure-token-bid",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0xaa16fd3f89fcc221b55be8ebd56c20abf3a580c60a83d5de297e0edf750aeae8",
//   numTopics: 3,
//   abi: new Interface([
//     `event TokenBidCreatedOrUpdated(
//         address bidder,
//         address nftAddress,
//         uint256 tokenId,
//         uint64 quantity,
//         uint128 pricePerItem,
//         uint64 expirationTime,
//         address paymentToken
//     );`,
//   ]),
// };
//
// // 0x2c452098
// export const bidTokenCancel: EventData = {
//   kind: "treasure",
//   subKind: "treasure-cancel-token-bid",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0xaa16fd3f89fcc221b55be8ebd56c20abf3a580c60a83d5de297e0edf750aeae8",
//   numTopics: 2,
//   abi: new Interface([
//     `event TokenBidCancelled(
//         address bidder,
//         address nftAddress,
//         uint256 tokenId
//     );`,
//   ]),
// };

//0x84fa3146
export const tokenBidAccepted: EventData = {
  kind: "treasure",
  subKind: "treasure-accept-bid",
  addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
  topic: "0xf6b2b7813b1815a0e2e32964b4f22ec24862322d9c9c0e0eefac425dfc455ab1",
  numTopics: 1,
  abi: new Interface([
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "seller",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "bidder",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "nftAddress",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint64",
          name: "quantity",
          type: "uint64",
        },
        {
          indexed: false,
          internalType: "uint128",
          name: "pricePerItem",
          type: "uint128",
        },
        {
          indexed: false,
          internalType: "address",
          name: "paymentToken",
          type: "address",
        },
        {
          indexed: false,
          internalType: "enum BidType",
          name: "bidType",
          type: "uint8",
        },
      ],
      name: "BidAccepted",
      type: "event",
    },
  ]),
};

// 0xc564e3a1
// export const bidCollectionCreatedOrUpdated: EventData = {
//   kind: "treasure",
//   subKind: "treasure-collection-bid",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
//   numTopics: 3,
//   abi: new Interface([
//     `event CollectionBidCreatedOrUpdated(
//         address bidder,
//         address nftAddress,
//         uint64 quantity,
//         uint128 pricePerItem,
//         uint64 expirationTime,
//         address paymentToken
//     );`,
//   ]),
// };

// // 0xc564e3a1
// export const bidCollectionCancel: EventData = {
//   kind: "treasure",
//   subKind: "treasure-cancel-collection-bid",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f",
//   numTopics: 2,
//   abi: new Interface([
//     `event CollectionBidCancelled(
//         address bidder,
//         address nftAddress
//     );`,
//   ]),
// };

// // 0x656b67ad
// export const collectionBidAccepted: EventData = {
//   kind: "treasure",
//   subKind: "treasure-accept-bid",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0xf6b2b7813b1815a0e2e32964b4f22ec24862322d9c9c0e0eefac425dfc455ab1",
//   numTopics: 1,
//   abi: new Interface([
//     `event BidAccepted(
//         address seller,
//         address bidder,
//         address nftAddress,
//         uint256 tokenId,
//         uint64 quantity,
//         uint128 pricePerItem,
//         address paymentToken,
//         BidType bidType
//     );`,
//   ]),
// };

//0x143f05e1
// export const itemListed: EventData = {
//   kind: "treasure",
//   subKind: "treasure-list",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0xb21f4a0122c6667aa16da06fcb7d9d3b2688164dfb40b7253aed80ea36d88e99",
//   numTopics: 1,
//   abi: new Interface([
//     `event ItemListed(
//         address seller,
//         address nftAddress,
//         uint256 tokenId,
//         uint64 quantity,
//         uint128 pricePerItem,
//         uint64 expirationTime,
//         address paymentToken
//     );`,
//   ]),
// };
//
// // 0x9a867aab
// export const itemListUpdated: EventData = {
//   kind: "treasure",
//   subKind: "treasure-list-update",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0xde1951e410d2f4644b8dd23d6b9e5d2e862b417055f42e3939ab16b4635ec6de",
//   numTopics: 1,
//   abi: new Interface([
//     `event ItemUpdated(
//         address seller,
//         address nftAddress,
//         uint256 tokenId,
//         uint64 quantity,
//         uint128 pricePerItem,
//         uint64 expirationTime,
//         address paymentToken
//     );`,
//   ]),
// };
//
// //0xb2ddee06
// export const itemListCanceled: EventData = {
//   kind: "treasure",
//   subKind: "treasure-list-cancel",
//   addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
//   topic: "0x9ba1a3cb55ce8d63d072a886f94d2a744f50cddf82128e897d0661f5ec623158",
//   numTopics: 1,
//   abi: new Interface([
//     `event ItemCanceled(
//         address indexed seller,
//         address indexed nftAddress,
//         uint256 indexed tokenId
//      );`,
//   ]),
// };

//0xa07076b2
export const itemSold: EventData = {
  kind: "treasure",
  subKind: "treasure-sold",
  addresses: { [Treasure.Addresses.Exchange[config.chainId]?.toLowerCase()]: true },
  topic: "0x72d3f914473a393354e6fcd9c3cb7d2eee53924b9b856f9da274e024566292a5",
  numTopics: 1,
  abi: new Interface([
    `event ItemSold(
        address seller,
        address buyer,
        address nftAddress,
        uint256 tokenId,
        uint64 quantity,
        uint128 pricePerItem,
        address paymentToken
    );`,
  ]),
};
