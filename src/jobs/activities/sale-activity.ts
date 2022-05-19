import { ActivityInfo } from "@/jobs/activities/index";
import { ActivitiesEntityInsertParams } from "@/models/activities/activities-entity";
import { Tokens } from "@/models/tokens";
import _ from "lodash";
import { logger } from "@/common/logger";
import { Activities } from "@/models/activities";

export class SaleActivity {
  public static async handleEvent(activity: ActivityInfo) {
    const token = await Tokens.getByContractAndTokenId(activity.contract, activity.tokenId);

    // If no token found
    if (_.isNull(token)) {
      logger.error("sale-activity", `No token found for ${JSON.stringify(activity)}`);
      return;
    }

    const transactionId = Activities.getTransactionId(
      activity.fromAddress,
      activity.metadata?.transactionHash,
      activity.metadata?.logIndex,
      activity.metadata?.batchIndex
    );

    const activityParams: ActivitiesEntityInsertParams = {
      transactionId,
      contract: activity.contract,
      collectionId: token.collectionId,
      tokenId: activity.tokenId,
      address: activity.fromAddress,
      fromAddress: activity.fromAddress,
      toAddress: activity.toAddress,
      price: activity.price,
      amount: activity.amount,
      metadata: activity.metadata,
    };

    await Activities.add(activityParams);
  }
}
