// event.monitor.route.ts
import { Hono } from "hono";
import redis from "@/constants/redis";

export const eventMonitorRoute = new Hono();

eventMonitorRoute.get("/", async (c) => {
  try {
    const statusFilter = c.req.query("status");
    const consumerFilter = c.req.query("consumer");

    const keys = await redis.keys("eventlog:*");
    if (keys.length === 0) {
      return c.json({ message: "No events logged yet", data: [] });
    }

    const events = [];
    for (const key of keys) {
      const eventId = key.split(":")[1];
      const log = await redis.hgetall(key);
      const event = {
        eventId,
        status: log.status || "unknown",
        consumer: log.consumedBy || null,
        publishedAt: log.publishedAt || null,
        consumedAt: log.consumedAt || null,
        publisher: log.publisher || null,
        routingKey: log.routingKey || null,
      };

      if (statusFilter && event.status !== statusFilter) continue;
      if (consumerFilter && event.consumer !== consumerFilter) continue;

      events.push(event);
    }

    return c.json({ total: events.length, data: events });
  } catch (err: any) {
    return c.json({ error: "Failed to fetch event logs", details: err.message }, 500);
  }
});
