import { Hono } from "hono";
import axios from "axios";
import { connectRabbitMQ, getRabbitMQChannel } from "@/messaging/broker";

export const rabbitMonitorRoute = new Hono();

// RabbitMQ mgmt config
const mgmt = axios.create({
  baseURL: process.env.RABBITMQ_MGMT_URL || "http://localhost:15672/api",
  auth: {
    username: process.env.RABBITMQ_MGMT_USER || "user",
    password: process.env.RABBITMQ_MGMT_PASS || "password",
  },
});

// temp event log
const rabbitEventLog: any[] = [];
const log = (e: any) => {
  rabbitEventLog.unshift({ ts: new Date().toISOString(), ...e });
  if (rabbitEventLog.length > 2000) rabbitEventLog.pop();
};

// ----------------------------------------
// health
// ----------------------------------------
rabbitMonitorRoute.get("/health", async (c) => {
  try {
    await connectRabbitMQ();
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false });
  }
});

// ----------------------------------------
// list queues
// ----------------------------------------
rabbitMonitorRoute.get("/queues", async (c) => {
  const res = await mgmt.get("/queues");
  return c.json(res.data);
});

// ----------------------------------------
// list exchanges
// ----------------------------------------
rabbitMonitorRoute.get("/exchanges", async (c) => {
  const res = await mgmt.get("/exchanges");
  return c.json(res.data);
});

// ----------------------------------------
// list bindings
// ----------------------------------------
rabbitMonitorRoute.get("/bindings", async (c) => {
  const res = await mgmt.get("/bindings");
  return c.json(res.data);
});

// ----------------------------------------
// queue detail
// ----------------------------------------
rabbitMonitorRoute.get("/queue/:queue", async (c) => {
  const q = c.req.param("queue");
  const res = await mgmt.get(`/queues/%2f/${q}`);
  return c.json(res.data);
});

// ----------------------------------------
// messages snapshot
// ----------------------------------------
rabbitMonitorRoute.get("/queue/:queue/messages", async (c) => {
  const q = c.req.param("queue");

  const res = await mgmt.post(`/queues/%2f/${q}/get`, {
    count: 250,
    ackmode: "ack_requeue_true",
    encoding: "auto",
  });

  return c.json(res.data);
});

// ----------------------------------------
// purge queue
// ----------------------------------------
rabbitMonitorRoute.post("/queue/:queue/purge", async (c) => {
  const q = c.req.param("queue");
  await mgmt.delete(`/queues/%2f/${q}/contents`);
  return c.json({ ok: true, purged: q });
});

// ----------------------------------------
// delete queue
// ----------------------------------------
rabbitMonitorRoute.delete("/queue/:queue", async (c) => {
  const q = c.req.param("queue");
  await mgmt.delete(`/queues/%2f/${q}`);
  return c.json({ ok: true, deleted: q });
});

// ----------------------------------------
// publish message
// ----------------------------------------
rabbitMonitorRoute.post("/publish", async (c) => {
  const { exchange, routingKey, payload } = await c.req.json();
  const ch = getRabbitMQChannel();

  ch.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );

  log({ type: "publish", exchange, routingKey, payload });

  return c.json({ ok: true });
});

// ----------------------------------------
// single message consume
// ----------------------------------------
rabbitMonitorRoute.post("/consume/:queue", async (c) => {
  const q = c.req.param("queue");
  const ch = getRabbitMQChannel();

  await ch.assertQueue(q);
  const msg = await ch.get(q, { noAck: false });

  if (!msg) return c.json({ empty: true });

  const body = msg.content.toString();
  ch.ack(msg);

  log({ type: "consume", queue: q, payload: body });

  return c.json({ ok: true, data: JSON.parse(body) });
});

// ----------------------------------------
// start worker listener
// ----------------------------------------
rabbitMonitorRoute.post("/worker/:queue", async (c) => {
  const q = c.req.param("queue");
  const ch = getRabbitMQChannel();

  await ch.assertQueue(q);

  ch.consume(q, (msg: any) => {
    if (!msg) return;
    const body = msg.content.toString();
    log({ type: "worker", queue: q, payload: body });
    ch.ack(msg);
  });

  return c.json({ ok: true, worker: q });
});

// ----------------------------------------
// event log viewer
// ----------------------------------------
rabbitMonitorRoute.get("/events", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  return c.json(rabbitEventLog.slice(0, limit));
});

export default rabbitMonitorRoute;