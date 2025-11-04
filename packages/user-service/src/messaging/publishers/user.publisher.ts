import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

export async function publishUserRegistered(data: { userId: string; email: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "user.registered", data);
    console.log(`[PUBLISH] UserRegistered event for ID: ${data.userId}`);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish user.registered:", error);
  }
}

export async function publishAssignUserToKitchen(data: { userId: string; kitchenId: string; createdBy: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "kitchen.assign.commit", data);
    console.log(`[PUBLISH] AssignUserToKitchen event for user: ${data.userId}`);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish kitchen.assign.commit:", error);
  }
}

export async function publishAssignUserToSchool(data: { userId: string; schoolId: string; createdBy: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "school.assign.commit", data);
    console.log(`[PUBLISH] AssignUserToSchool event for user: ${data.userId}`);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish school.assign.commit:", error);
  }
}

export async function publishAssignProfileDriver(data: { userId: string; kitchenId: string; createdBy: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "driver.assign.commit", data);
    console.log(`[PUBLISH] AssignProfileDriver event for user: ${data.userId}`);
  } catch (error) {
    console.error("[PUBLISH ERROR] Failed to publish driver.assign.commit:", error);
  }
}

