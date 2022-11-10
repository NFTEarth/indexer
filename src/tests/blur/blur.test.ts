import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import { baseProvider } from "@/common/provider";
import { getEventsFromTx, wait } from "../utils/test";
import { handleEvents } from "@/events-sync/handlers/blur";
import { Blur } from "@reservoir0x/sdk";
import { config } from "@/config/index";
import { OrderInfo } from "@/orderbook/orders/blur";
import { processOnChainData } from "@/events-sync/handlers/utils";
import { idb, pgp } from "@/common/db";
// import * as commonHelpers from "@/orderbook/orders/common/helpers";
import { toBuffer } from "@/common/utils";
import { getOrder } from "tests/utils/order";

async function saveContract(address: string, kind: string) {
  const columns = new pgp.helpers.ColumnSet(["address", "kind"], {
    table: "contracts",
  });
  const queries = [
    `
  INSERT INTO "contracts" (
    "address",
    "kind"
  ) VALUES ${pgp.helpers.values(
    {
      address: toBuffer(address),
      kind,
    },
    columns
  )}
  ON CONFLICT DO NOTHING
`,
  ];
  await idb.none(pgp.helpers.concat(queries));
}

describe("Blur", () => {
  test("BlurSwap - single-sale router", async () => {
    const tx = await baseProvider.getTransactionReceipt(
      "0x9e4e8ba883e49c296c16f7c06b7f68244c5b916085afee05d24be6d2f02716ca"
    );
    const events = await getEventsFromTx(tx);
    const result = await handleEvents(events);
    const maker = "0xb235ba58e93ba482b19e81d66eb001cd6ffd601b";
    const taker = "0xed2ab4948ba6a909a7751dec4f34f303eb8c7236";
    const fillEvent = result?.fillEvents?.find((c) => c.maker === maker && c.taker === taker);
    expect(fillEvent).not.toBe(null);
  });

  test("BlurSwap - multiple-sales router", async () => {
    const tx = await baseProvider.getTransactionReceipt(
      "0x0abdd7ceddcb1f54c82a89e0d026fbd160c36ebfe155421443097d3c5cdc9bb2"
    );
    const events = await getEventsFromTx(tx);
    const result = await handleEvents(events);

    const taker = "0x762172c3c9030e13fdaca2ee0de5b0d152ee604e";
    const maker1 = "0x88da8e5677dee90ffa14b307b2b16bce1a74c21d";
    const maker2 = "0xb99f2a6c6576a1e1b1cc6c787e3eff30d9fd9d44";

    const fillEvent1 = result?.fillEvents?.find((c) => c.maker === maker1 && c.taker === taker);
    const fillEvent2 = result?.fillEvents?.find((c) => c.maker === maker2 && c.taker === taker);

    expect(fillEvent1).not.toBe(null);
    expect(fillEvent2).not.toBe(null);
  });

  test("BlurExchange - single-sale", async () => {
    const tx = await baseProvider.getTransactionReceipt(
      "0x344f5ddfc0d4fd239303f6b67aeb18f57b6932edb123859c7a66548eb0ce5364"
    );
    const events = await getEventsFromTx(tx);
    const result = await handleEvents(events);
    const orderSide = "sell";
    const maker = "0xf16688ea2488c0d41a13572a7399e03069d49a1a";
    const taker = "0x28cd0dfc42756f68b3e1f8883e517e64e474078a";
    const fillEvent = result?.fillEvents?.find(
      (c) => c.orderSide === orderSide && c.maker === maker && c.taker === taker
    );
    expect(fillEvent).not.toBe(null);
  });

  test("BlurSwap - multiple-sales(2)", async () => {
    const tx = await baseProvider.getTransactionReceipt(
      "0x1a52974c5c87e6096617413e2b0ba29e0f9059a8283aa9b9fdf44b3a6aecb881"
    );
    const events = await getEventsFromTx(tx);
    const result = await handleEvents(events);

    const taker = "0xda37896e56f12d640230a9e5115756a5cda9a581";
    const maker1 = "0xdeffc73e9e677e8b42d805e6460b4ef28c53adc3";
    const maker2 = "0x730aba725664974efb753ee72ca789541c733db4";

    const orderSide = "sell";
    const fillEvent1 = result?.fillEvents?.find(
      (c) => c.orderSide === orderSide && c.maker === maker1 && c.taker === taker
    );
    const fillEvent2 = result?.fillEvents?.find(
      (c) => c.orderSide === orderSide && c.maker === maker2 && c.taker === taker
    );

    expect(fillEvent1).not.toBe(null);
    expect(fillEvent2).not.toBe(null);
  });

  test("order-saving", async () => {
    const rawData = `0x9a1fc3a70000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000001bacee62d7acadd0ae2b3a3a5a674f97671659ce51c9c292ac4a4c2193b3a0891042c94a13168ff144eb30131161d8b0aabb588296d5db1713ce58fd480d3bf09700000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000f26fdf000000000000000000000000f65d928d8c143e49096cf666095a2be54bd431eb000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000006411739da1c40b106f8511de5d1fac00000000000000000000000005da517b1bf9999b7762eaefa8372341a1a475590000000000000000000000000000000000000000000000000000000000001668000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000917070797e18000000000000000000000000000000000000000000000000000000000006362a59800000000000000000000000000000000000000000000000000000000638a329800000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000053cae46abac64a5d1dc3a8ad0746b5c00000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001d89573ca21c1878c2b55da13ef170bbcd599defb26a6e277239b686e38bb1e1900000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f26fdf00000000000000000000000000fb2499403afeccd48f0fb29da41cde8c113d4b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006411739da1c40b106f8511de5d1fac00000000000000000000000005da517b1bf9999b7762eaefa8372341a1a475590000000000000000000000000000000000000000000000000000000000001668000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000917070797e180000000000000000000000000000000000000000000000000000000000063636fa90000000000000000000000000000000000000000000000000000000063638bc900000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000002d01851a2889aa9cb3ccd62f4322510e00000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`;
    const exchange = new Blur.Exchange(config.chainId);
    const builder = new Blur.Builders.SingleToken(config.chainId);
    const inputData = exchange.contract.interface.decodeFunctionData("execute", rawData);

    const sellInput = inputData.sell;
    const sellOrder = sellInput.order;

    const order = builder.build({
      side: sellOrder.side === 1 ? "sell" : "buy",
      trader: sellOrder.trader,
      collection: sellOrder.collection,
      tokenId: sellOrder.tokenId.toString(),
      amount: sellOrder.amount.toString(),
      paymentToken: sellOrder.paymentToken,
      price: sellOrder.price.toString(),
      listingTime: sellOrder.listingTime.toString(),
      matchingPolicy: sellOrder.matchingPolicy,
      nonce: 0,
      expirationTime: sellOrder.expirationTime.toString(),
      fees: sellOrder.fees.map((_: { recipient: string; rate: number }) => {
        return {
          rate: _.rate,
          recipient: _.recipient,
        };
      }),
      salt: sellOrder.salt.toString(),
      extraParams: sellOrder.extraParams,
      r: sellInput.r,
      v: sellInput.v,
      s: sellInput.s,
      extraSignature: sellInput.extraSignature,
      signatureVersion: sellInput.signatureVersion,
      blockNumber: sellInput.blockNumber.toString(),
    });

    await saveContract(sellOrder.collection.toLowerCase(), "erc721");

    // const kind = await commonHelpers.getContractKind(sellOrder.collection.toLowerCase());

    // Store orders
    const orders: OrderInfo[] = [];
    orders.push({
      orderParams: order.params,
      metadata: {},
    });

    await processOnChainData({
      orders: orders.map((info) => ({
        kind: "blur",
        info,
      })),
    });

    const orderInDb = await getOrder(
      "0x71ba349119ef6685a84da0ccd810ec3070345608fe981619f071ad268b499eba"
    );

    await wait(20 * 1000);
    // console.log("orderInDb", orderInDb);
    expect(orderInDb).not.toBe(null);
  });

  test("cancelOrder", async () => {
    const tx = await baseProvider.getTransactionReceipt(
      "0x567d3d9cc5f4f642c9c4711d375b439f0efdf98033545a05d5bb161669a8f976"
    );
    const events = await getEventsFromTx(tx);
    const result = await handleEvents(events);
    expect(result.cancelEventsOnChain?.length).toEqual(1);
  });

  // test("cancelERC1155Order", async () => {
  //   const tx = await baseProvider.getTransactionReceipt(allTx.cancelERC1155Order);
  //   const events = await getEventsFromTx(tx);
  //   const result = await handleEvents(events);
  //   expect(result.nonceCancelEvents?.length).toEqual(1);
  // });
});
