import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

export async function publishUserRegistered(data: { userId: string; email: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "user.registered", data);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish user.registered:", error);
  }
}

export async function publishAssignUserToKitchen(data: { userId: string; kitchenId: string; createdBy: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "kitchen.assign.commit", data);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish kitchen.assign.commit:", error);
  }
}

export async function publishAssignUserToBeneficiary(data: { userId: string; beneficiaryId: string; createdBy: string; }) {
  try {
    await safePublish(EXCHANGES.BENEFICIARY, "beneficiary.assign.commit", data);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish eneficiary.assign.commit:", error);
  }
}

export async function publishAssignProfileDriver(data: { userId: string; kitchenId: string; createdBy: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "driver.assign.commit", data);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish driver.assign.commit:", error);
  }
}

