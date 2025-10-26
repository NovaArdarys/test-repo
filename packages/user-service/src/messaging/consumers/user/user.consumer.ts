import * as amqplib from 'amqplib';
import { EXCHANGE_NAME } from '@/constants/config';

const QUEUE_NAME = 'user_service_log_queue';
const ROUTING_KEY = 'log.#'; // listen add key with 'log.'

function handleLogEvent(msg: amqplib.ConsumeMessage | null) {
  if (msg) {
    try {
      const content = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;

      console.warn(`[EVENT IN] [${routingKey}] Received log event:`, content);

      rabbitMQChannel.ack(msg);

    } catch (error) {
      console.error("Error processing log event:", error);
      rabbitMQChannel.nack(msg, false, false);
    }
  }
}

let rabbitMQChannel: amqplib.Channel;

export async function setupLogConsumer(channel: amqplib.Channel): Promise<void> {
  rabbitMQChannel = channel;

  await channel.assertExchange(EXCHANGE_NAME.LOG_EVENTS, 'topic', { durable: true });


  const q = await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log(`[*] User Service waiting for log events in ${q.queue}`);

  await channel.bindQueue(q.queue, EXCHANGE_NAME.LOG_EVENTS, ROUTING_KEY);
  channel.prefetch(10);

  channel.consume(q.queue, handleLogEvent, {
    noAck: false
  });
}