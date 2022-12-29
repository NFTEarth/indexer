import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import { config } from "@/config/index";
import { Seaport } from "@reservoir0x/sdk";
import { keccak256 } from "ethers/lib/utils";
import { toUtf8Bytes } from "@ethersproject/strings";
import { BigNumber } from "ethers";
import { padSourceToSalt } from "@/orderbook/orders/seaport/build/utils";

jest.setTimeout(1000 * 1000);

export const generateSourceBytes = (source?: string) => {
  return source ? keccak256(toUtf8Bytes(source)).slice(2, 10) : "";
};

describe("CallData - Seaport", () => {
  it("parseOrder", async () => {
    const exchange = new Seaport.Exchange(config.chainId);
    const inputData =
      "0xfb0f3ee10000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006651728988000000000000000000000000000656a41eebec46a6f3709783c8c93c2e522d2afeb000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c0000000000000000000000000001709c4b31187914458ad7130e204d9e5388ea7b0000000000000000000000000000000000000000000000000000000000000f99000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000063a9eca50000000000000000000000000000000000000000000000000000000063d025bb0000000000000000000000000000000000000000000000000000000000000000360c6ebe0000000000000000000000000000000000000000b04453f5f09a024b0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000002d79883d20000000000000000000000000000000a26b00c1f0df003000390027140000faa7190000000000000000000000000000000000000000000000000000886c98b76000000000000000000000000000ea290fe57d2916e737fe6795479ddf24dca42075000000000000000000000000000000000000000000000000000000000000004182f42875a607a0a97241a6991b8920e8f807c8a742cd43a54a9bc2dcd25f54375494428e679c4179dad1c2f2ce5c9ca35790544f2d3129716836e1aee99aa5c81b00000000000000000000000000000000000000000000000000000000000000360c6ebe";
    const args = exchange.contract.interface.decodeFunctionData("fulfillBasicOrder", inputData);
    const orderSourceHash = args.parameters.salt._hex.slice(2, 10);

    const openseaHash = "360c6ebe";
    const source = "opensea.io";
    const sourceHash = generateSourceBytes(source);

    const salt = "1234";
    const saltSource = padSourceToSalt(source, salt);
    const saltWithSource = BigNumber.from(saltSource)._hex;

    expect(saltWithSource.slice(2, 10)).toBe(openseaHash);
    expect(sourceHash).toBe(openseaHash);
    expect(orderSourceHash).toBe(openseaHash);
  });
});
