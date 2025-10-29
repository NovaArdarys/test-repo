import { connect } from 'amqplib';

import * as amqp from 'amqplib';
import { EXCHANGES } from './events/exchanges';

interface RabbitMQConnection {
  connection: amqp.Connection | null;
  channel: amqp.Channel | null;
}

const rabbitMQState: RabbitMQConnection = {
  connection: null,
  channel: null,
};

export async function connectRabbitMQ(): Promise<amqp.Channel> {
  if (rabbitMQState.channel) {
    return rabbitMQState.channel;
  }

  try {
    console.log(`Connecting to RabbitMQ at ${process.env.RABBITMQ_HOST}...`);
    console.log(`RabbitMQ at ${process.env.RABBITMQ_URL}...`);

    const connection = await amqp.connect(process.env.RABBITMQ_URL || "");
    rabbitMQState.connection = connection as any;

    connection.on("error", (err) => {
      console.error("RabbitMQ Connection Error:", err.message);
    });
    connection.on("close", () => {
      console.error("RabbitMQ Connection Closed! Attempting to reconnect in 5s...");
      setTimeout(connectRabbitMQ, 5000);
    });

    const channel = await connection.createChannel();
    rabbitMQState.channel = channel;

    await channel.assertExchange(EXCHANGES.USER, 'topic', { durable: true });

    console.log("RabbitMQ connected and channel created successfully.");
    return channel;

  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    console.log("Retrying RabbitMQ connection in 10s...");
    console.log(`Connecting to RabbitMQ at ${process.env.RABBITMQ_HOST}...`);
    console.log(`RabbitMQ at ${process.env.RABBITMQ_URL}...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    return connectRabbitMQ();
  }
}

export function getRabbitMQChannel(): amqp.Channel {
  if (!rabbitMQState.channel) {
    throw new Error("RabbitMQ channel not initialized. Call connectRabbitMQ() first.");
  }
  return rabbitMQState.channel;
}

export async function checkBroker() {
  try {
    const conn = await connect(process.env.RABBITMQ_URL || "amqp://rabbitmq:5672");
    await conn.close();
    return { status: "Connected" };
  } catch (err) {
    return { status: "Disconnected", URL: process.env.RABBITMQ_URL || "Not Detected", error: (err as Error).message };
  }
}
