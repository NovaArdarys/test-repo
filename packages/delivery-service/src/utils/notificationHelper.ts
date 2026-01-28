import { processStatus } from "@/messaging/publishers/notification.publisher";
import { ProcessStatusPayload } from "@/validators/event/process.status.event";

type NotificationStatus = "QUEUED" | "COMPLETED" | "FAILED";

interface SendProcessStatusParams {
  status: NotificationStatus;
  basePayload: Omit<
    ProcessStatusPayload,
    | "status"
    | "step"
    | "title"
    | "message"
    | "userReceivedId"
    | "timestamp"
  >;
  config: {
    step: string;
    title: string;
    message: string;
  };
  recipientUserIds: string[];
}

export async function sendProcessStatusNotification({
  status,
  basePayload,
  config,
  recipientUserIds,
}: SendProcessStatusParams) {
  const sender =
    status === "COMPLETED"
      ? processStatus.completed
      : status === "FAILED"
        ? processStatus.failed
        : processStatus.queued;

  await Promise.all(
    recipientUserIds.map((userId) =>
      sender({
        ...basePayload,
        ...config,
        status,
        userReceivedId: userId,
        timestamp: new Date().toISOString(),
      })
    )
  );
}
