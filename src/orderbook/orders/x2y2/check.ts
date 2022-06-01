import * as Sdk from "@reservoir0x/sdk";

import { baseProvider } from "@/common/provider";
import { bn } from "@/common/utils";
import { config } from "@/config/index";
import * as commonHelpers from "@/orderbook/orders/common/helpers";

// TODO: Add support for on-chain check

export const offChainCheck = async (
  order: Sdk.X2Y2.Order,
  options?: {
    // Some NFTs pre-approve common exchanges so that users don't
    // spend gas approving them. In such cases we will be missing
    // these pre-approvals from the local database and validation
    // purely from off-chain state can be inaccurate. In order to
    // handle this, we allow the option to double validate orders
    // on-chain in case off-chain validation returns the order as
    // being invalid.
    onChainApprovalRecheck?: boolean;
    checkFilledOrCancelled?: boolean;
  }
) => {
  const id = order.params.itemHash;

  // Check: order has a valid target
  const kind = await commonHelpers.getContractKind(order.params.nft.token);
  if (!kind) {
    throw new Error("invalid-target");
  }

  if (options?.checkFilledOrCancelled) {
    // Check: order is not cancelled
    const cancelled = await commonHelpers.isOrderCancelled(id);
    if (cancelled) {
      throw new Error("cancelled");
    }

    // Check: order is not filled
    const quantityFilled = await commonHelpers.getQuantityFilled(id);
    if (quantityFilled.gte(1)) {
      throw new Error("filled");
    }
  }

  let hasBalance = true;
  let hasApproval = true;
  if (order.params.type === "buy") {
    // Check: maker has enough balance
    const ftBalance = await commonHelpers.getFtBalance(order.params.currency, order.params.maker);
    if (ftBalance.lt(order.params.currency)) {
      hasBalance = false;
    }

    // TODO: Integrate off-chain approval checking
    if (options?.onChainApprovalRecheck) {
      const erc20 = new Sdk.Common.Helpers.Erc20(baseProvider, order.params.currency);
      if (
        bn(
          await erc20.getAllowance(order.params.maker, Sdk.X2Y2.Addresses.Exchange[config.chainId])
        ).lt(order.params.currency)
      ) {
        hasApproval = false;
      }
    }
  } else {
    // Check: maker has enough balance
    const nftBalance = await commonHelpers.getNftBalance(
      order.params.nft.token,
      order.params.nft.tokenId,
      order.params.maker
    );
    if (nftBalance.lt(1)) {
      hasBalance = false;
    }

    const operator = Sdk.X2Y2.Addresses.Erc721Delegate[config.chainId];

    // Check: maker has set the proper approval
    const nftApproval = await commonHelpers.getNftApproval(
      order.params.nft.token,
      order.params.maker,
      operator
    );
    if (!nftApproval) {
      if (options?.onChainApprovalRecheck) {
        // Re-validate the approval on-chain to handle some edge-cases
        const contract =
          kind === "erc721"
            ? new Sdk.Common.Helpers.Erc721(baseProvider, order.params.nft.token)
            : new Sdk.Common.Helpers.Erc1155(baseProvider, order.params.nft.token);
        if (!(await contract.isApproved(order.params.maker, operator))) {
          hasApproval = false;
        }
      } else {
        hasApproval = false;
      }
    }
  }

  if (!hasBalance && !hasApproval) {
    throw new Error("no-balance-no-approval");
  } else if (!hasBalance) {
    throw new Error("no-balance");
  } else if (!hasApproval) {
    throw new Error("no-approval");
  }
};
