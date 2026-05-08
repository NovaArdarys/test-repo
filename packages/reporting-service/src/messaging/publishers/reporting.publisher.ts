import z from "zod";
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

export interface StorageDeleteEvent {
  storageIds: string[];
  paths: string[];
}

export async function publishStorageDelete(data: StorageDeleteEvent) {
  try {
    await safePublish(EXCHANGES.STORAGE, "storage.delete", data);
  } catch (err) {
    console.error("[STORAGE DELETE PUBLISH ERROR]", err);
  }
}

export async function publishEventReportCommit(data: EventReportCommit) {
  try {
    await safePublish(EXCHANGES.REPORT, "client.storage.commit", data);
    console.log(`Published ${data.entityType}`);
  } catch (err) {
    console.error("[STORAGE PUBLISH ERROR]", err);
  }
}

const reportCreatedSchema = z.object({
  sagaId: z.string(),
  jobId: z.string(),
  menuPlanId: z.string(),
  kitchenId: z.string(),
  status: z.enum(['SUCCESS', 'FAILED']),
  result: z.object({
    kitchenDailyReportId: z.string().optional(),
    beneficiaryReportsCount: z.number().optional(),
  }).optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }).optional(),
  _meta: z.object({
    eventId: z.string().optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

export async function publishReportEvent(
  routingKey: "report.created" | "report.failed",
  data: z.infer<typeof reportCreatedSchema>
) {
  try {
    const validated = reportCreatedSchema.parse(data);

    await safePublish(
      EXCHANGES.REPORT,
      routingKey,
      validated
    );

  } catch (err) {
    throw err;
  }
}

