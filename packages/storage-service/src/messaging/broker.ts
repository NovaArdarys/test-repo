import * as amqp from "amqplib";
import { EXCHANGES } from "./events/exchanges";

interface RabbitMQConnection {
  connection: amqp.Connection | null;
  channel: amqp.ConfirmChannel | null;
}

const rabbitMQState: RabbitMQConnection = {
  connection: null,
  channel: null,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function connectRabbitMQ(): Promise<amqp.ConfirmChannel> {
  if (rabbitMQState.channel) return rabbitMQState.channel;

  try {
    console.log(`Connecting to RabbitMQ at ${process.env.RABBITMQ_URL}...`);
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    rabbitMQState.connection = connection as any;

    connection.on("error", (err) => {
      console.error("[RABBITMQ] Connection Error:", err.message);
    });

    connection.on("close", () => {
      console.warn("[RABBITMQ] Connection closed! Reconnecting in 5s...");
      rabbitMQState.connection = null;
      rabbitMQState.channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    const channel = await connection.createConfirmChannel();
    rabbitMQState.channel = channel;

    channel.prefetch(10);

    channel.on("error", (err) => {
      console.error("[RABBITMQ] Channel error:", err.message);
      rabbitMQState.channel = null;
    });

    channel.on("close", () => {
      console.warn("[RABBITMQ] Channel closed. Will recreate...");
      rabbitMQState.channel = null;
    });

    await channel.assertExchange(EXCHANGES.STORAGE, "topic", { durable: true });

    console.log("✅ RabbitMQ connected & ConfirmChannel created");
    return channel;
  } catch (error) {
    console.error("[RABBITMQ] Connection failed:", error);
    console.log("Retrying connection in 10s...");
    await wait(10000);
    return connectRabbitMQ();
  }
}

export function getRabbitMQChannel(): amqp.ConfirmChannel {
  if (!rabbitMQState.channel) {
    throw new Error("RabbitMQ channel not initialized. Call connectRabbitMQ() first.");
  }
  return rabbitMQState.channel;
}

export async function checkBroker() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    await conn.close();
    return { status: "Connected" };
  } catch (err) {
    return {
      status: "Disconnected",
      URL: process.env.RABBITMQ_URL || "Not Detected",
      error: (err as Error).message,
    };
  }
}
