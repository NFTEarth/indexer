import { fromBuffer } from "@/common/utils";

export enum ActivityType {
  sale = "sale",
  listing = "listing",
  transfer = "transfer",
  mint = "mint",
  bid = "bid",
  bid_cancel = "bid_cancel",
  listing_cancel = "listing_cancel",
}

export enum ActivitySubject {
  user = "user",
  token = "token",
  collection = "collection",
}

// Define the fields required to create a new activity
export type ActivitiesEntityInsertParams = {
  subject: ActivitySubject;
  type: ActivityType;
  activityHash: string;
  contract: string;
  collectionId: string;
  tokenId: string | null;
  address: string;
  fromAddress: string;
  toAddress: string | null;
  price: number;
  amount: number;
  metadata?: ActivityMetadata;
};

// Define the fields we can update
export type ActivitiesEntityUpdateParams = {
  createdAt?: string;
  contract?: string;
  collectionId?: string;
  tokenId?: string;
  address?: string;
  fromAddress?: string;
  toAddress?: string;
  price?: number;
  amount?: number;
  metadata?: ActivityMetadata;
};

// Define the fields need to instantiate the entity
export type ActivitiesEntityParams = {
  id: number;
  created_at: Date;
  subject: ActivitySubject;
  activity_hash: string;
  type: ActivityType;
  contract: Buffer;
  collection_id: string;
  token_id: string;
  address: Buffer;
  from_address: Buffer;
  to_address: Buffer;
  price: number;
  amount: number;
  metadata: ActivityMetadata;
};

// Possible fields to be found in the metadata
export type ActivityMetadata = {
  transactionHash?: string;
  logIndex?: number;
  batchIndex?: number;
  orderId?: string;
};

export class ActivitiesEntity {
  id: number;
  createdAt: Date;
  subject: ActivitySubject;
  activityHash: string;
  type: ActivityType;
  contract: string;
  collectionId: string;
  tokenId: string;
  address: string;
  fromAddress: string;
  toAddress: string;
  price: number;
  amount: number;
  metadata: ActivityMetadata;

  constructor(params: ActivitiesEntityParams) {
    this.id = params.id;
    this.createdAt = params.created_at;
    this.subject = params.subject;
    this.activityHash = params.activity_hash;
    this.type = params.type;
    this.contract = fromBuffer(params.contract);
    this.collectionId = params.collection_id;
    this.tokenId = params.token_id;
    this.address = fromBuffer(params.address);
    this.fromAddress = fromBuffer(params.from_address);
    this.toAddress = fromBuffer(params.to_address);
    this.price = params.price;
    this.amount = Number(params.amount);
    this.metadata = params.metadata;
  }
}
