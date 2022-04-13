export type SourcesEntityParams = {
  id: number;
  name: string;
  address: string;
  metadata: SourcesMetadata;
};

export type SourcesMetadata = {
  icon?: string | null;
  url?: string | null;
  urlMainnet?: string | null;
  urlRinkeby?: string | null;
};

export class SourcesEntity {
  id: number;
  name: string;
  address: string;
  metadata: SourcesMetadata;

  constructor(params: SourcesEntityParams) {
    this.id = params.id;
    this.name = params.name;
    this.address = params.address;
    this.metadata = params.metadata;
  }
}
