// event.monitor.route.ts
import { Hono } from "hono";
import redis from "@/constants/redis";
import { Queue, Job } from "bullmq";

// -------------------------------
// TYPES
// -------------------------------
type WorkerInfo = {
  id: string;
  status: "RUNNING" | "STOPPED";
};

type JobInfo = {
  id: string;
  name?: string;
  data?: any;
  progress?: number | null;
  reason?: string | null;
};

type QueueStatusSummary = {
  queue: string;
  workers: WorkerInfo[];
  active: JobInfo[];
  waiting: JobInfo[];
  delayed: JobInfo[];
  completed: JobInfo[];
  failed: JobInfo[];
};

type DiscoverQueuesResult = Map<string, Queue>;

// -------------------------------
// DISCOVER QUEUES
// -------------------------------
async function discoverQueues(): Promise<DiscoverQueuesResult> {
  const queues = new Map<string, Queue>();
  let cursor = 0;

  do {
    const scanResult = await redis.scan(cursor);
    const [nextCursor, keys] = scanResult as unknown as [string, string[]];

    cursor = Number(nextCursor);

    keys.forEach(key => {
      const match = key.match(/^bull:(.*):id$/);
      if (match) {
        const name = match[1];
        if (!queues.has(name)) {
          queues.set(name, new Queue(name, { connection: redis as any }));
        }
      }
    });
  } while (cursor !== 0);

  return queues;
}

// -------------------------------
// STATUS
// -------------------------------
async function detectFullStatus(): Promise<QueueStatusSummary[]> {
  const queues = await discoverQueues();
  const payload: QueueStatusSummary[] = [];

  for (const [name, queue] of queues as any) {
    const active = await queue.getJobs(["active"]);
    const waiting = await queue.getJobs(["waiting"]);
    const delayed = await queue.getJobs(["delayed"]);
    const completed = await queue.getJobs(["completed"]);
    const failed = await queue.getJobs(["failed"]);

    const workersRaw = await queue.getWorkers();
    const workers = workersRaw.map((w: any) => ({
      id: w.id ?? "unknown",
      status: w.isRunning ? "RUNNING" : "STOPPED",
    }));

    payload.push({
      queue: name,
      workers,
      active: active.map(mapJob),
      waiting: waiting.map(mapJob),
      delayed: delayed.map(mapJob),
      completed: completed.map(mapJob),
      failed: failed.map(mapJob),
    });
  }

  return payload;
}

function mapJob(j: Job): JobInfo {
  return {
    id: j.id ?? "unknown",
    name: j.name,
    data: j.data,
    progress: Number(j.progress) ?? null,
    reason: j.failedReason ?? null,
  };
}

// -------------------------------
// JOB ACTIONS
// -------------------------------
async function restartJob(jobId: string) {
  const queues = await discoverQueues();

  for (const [name, queue] of queues as any) {
    const job = await queue.getJob(jobId);
    if (!job) continue;

    await job.retry();
    return { ok: true, queue: name };
  }

  return { ok: false, reason: "JOB_NOT_FOUND" };
}

async function removeJob(jobId: string) {
  const queues = await discoverQueues();

  for (const [name, queue] of queues as any) {
    const job = await queue.getJob(jobId);
    if (!job) continue;

    await job.remove();
    return { ok: true, queue: name };
  }

  return { ok: false, reason: "JOB_NOT_FOUND" };
}

async function retryMultiJobs(jobIds: string[]) {
  const results = [];
  for (const id of jobIds) {
    const r = await restartJob(id);
    results.push({ jobId: id, ...r });
  }
  return results;
}

// -------------------------------
// QUEUE ACTIONS
// -------------------------------
async function pauseQueue(queueName: string) {
  const queues = await discoverQueues();
  const q = queues.get(queueName);

  if (!q) throw new Error("QUEUE_NOT_FOUND");
  await q.pause();

  return { ok: true };
}

async function resumeQueue(queueName: string) {
  const queues = await discoverQueues();
  const q = queues.get(queueName);

  if (!q) throw new Error("QUEUE_NOT_FOUND");
  await q.resume();

  return { ok: true };
}

async function killStuckWorkers() {
  const queues = await discoverQueues();

  for (const [, queue] of queues as any) {
    const jobs = await queue.getJobs(["active"]);
    for (const job of jobs) {
      await job.discard();
      await job.moveToFailed({ message: "killed" }, true);
    }
  }

  return { ok: true };
}

// -------------------------------
// ROUTES
// -------------------------------
const bullMonitorRoute = new Hono();

bullMonitorRoute.get("/status", async (c) => {
  return c.json(await detectFullStatus());
});

bullMonitorRoute.post("/job/:jobId/restart", async (c) => {
  return c.json(await restartJob(String(c.req.param("jobId"))));
});

bullMonitorRoute.delete("/job/:jobId", async (c) => {
  return c.json(await removeJob(String(c.req.param("jobId"))));
});

bullMonitorRoute.post("/queue/:queueName/pause", async (c) => {
  return c.json(await pauseQueue(String(c.req.param("queueName"))));
});

bullMonitorRoute.post("/queue/:queueName/resume", async (c) => {
  return c.json(await resumeQueue(String(c.req.param("queueName"))));
});

bullMonitorRoute.post("/workers/kill-stuck", async (c) => {
  return c.json(await killStuckWorkers());
});

bullMonitorRoute.post("/job/retry-many", async (c) => {
  const body = await c.req.json() as { jobIds: string[]; };
  return c.json(await retryMultiJobs(body.jobIds));
});

export default bullMonitorRoute;