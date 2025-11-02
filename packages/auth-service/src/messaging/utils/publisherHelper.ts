import { getRabbitMQChannel } from "../broker";

/**
 * safePublish - publish message ke RabbitMQ dengan confirm channel (ACK/NACK)
 * memastikan pesan diterima broker sebelum dianggap sukses.
 *
 * @param exchange - nama exchange RabbitMQ
 * @param routingKey - routing key (misal: "user.registered")
 * @param data - payload (akan di-stringify otomatis)
 */
export async function safePublish(exchange: string, routingKey: string, data: any) {
  const channel = getRabbitMQChannel();
  const message = Buffer.from(JSON.stringify(data));

  await channel.assertExchange(exchange, "topic", { durable: true });

  return new Promise<void>((resolve, reject) => {
    channel.publish(exchange, routingKey, message, { persistent: true }, (err) => {
      if (err) {
        console.error(`[RABBITMQ] ❌ Failed to publish [${routingKey}]:`, err.message);
        return reject(err);
      }
      console.log(`[RABBITMQ] ✅ Published [${routingKey}] to ${exchange}`);
      resolve();
    });
  });
}
