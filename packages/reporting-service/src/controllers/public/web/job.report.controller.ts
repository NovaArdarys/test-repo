// src/controllers/public/web/job.report.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { reportQueue } from "@/jobs/queue/report.queue";
import { ReportQueueSchema } from "@/jobs/types/report.type";

export const triggerReportJobHandler = catchAsync(async (c: Context) => {
  const body = await c.req.json();
  const parsed = ReportQueueSchema.parse(body);

  const idempotencyKey = `${parsed.type}:${parsed.data.menuPlanId}:${parsed.data.planStartDate ?? "none"}:${parsed.data._meta?.eventId ?? "none"}`;

  const job = await reportQueue.add(
    "report-create",
    {
      type: parsed.type,
      data: parsed.data,
    },
    {
      jobId: idempotencyKey, // BullMQ auto-dedup
      removeOnComplete: { age: 3600 * 24 * 7 },
      removeOnFail: { age: 3600 * 24 * 7 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );

  return c.json(
    {
      message: "Job queued successfully",
      jobId: job.id,
      idempotencyKey,
    },
    201
  );
});

export const getReportJobStatusHandler = catchAsync(async (c: Context) => {
  const jobId = c.req.param("jobId");
  const job = await reportQueue.getJob(jobId);

  if (!job) {
    return c.json({ message: "Job not found" }, 404);
  }

  const state = await job.getState();

  return c.json({
    data: {
      jobId: job.id,
      name: job.name,
      state,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    },
  });
});