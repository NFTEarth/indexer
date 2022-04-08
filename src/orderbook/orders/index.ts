export * as looksRare from "@/orderbook/orders/looks-rare";
export * as openDao from "@/orderbook/orders/opendao";
export * as wyvernV23 from "@/orderbook/orders/wyvern-v2.3";
export * as zeroExV4 from "@/orderbook/orders/zeroex-v4";

export type OrderKind =
  | "wyvern-v2"
  | "wyvern-v2.3"
  | "looks-rare"
  | "zeroex-v4-erc721"
  | "zeroex-v4-erc1155"
  | "opendao-erc721"
  | "opendao-erc1155";
