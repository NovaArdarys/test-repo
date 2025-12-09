import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

export interface StorageUploadEvent {
  id: string;
  menuPlanId: string;
  entityType?: string;
  entityId?: string;
  allStepCompleted: boolean;
}

export async function publishStepUpdate(data: StorageUploadEvent) {
  try {
    await safePublish(EXCHANGES.REPORT, "report.step.commit", data);
    console.log(`Published ${data.entityType}`);
  } catch (err) {
    console.error("[STORAGE PUBLISH ERROR]", err);
  }
}

export interface EventReportCommit {
  entityId: string;
  entityType?: string;
  storageIds: string[];
}

export async function publishEventReportCommit(data: EventReportCommit) {
  try {
    await safePublish(EXCHANGES.REPORT, "client.storage.commit", data);
    console.log(`Published ${data.entityType}`);
  } catch (err) {
    console.error("[STORAGE PUBLISH ERROR]", err);
  }
}

