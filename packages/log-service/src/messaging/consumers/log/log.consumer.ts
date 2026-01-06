import * as amqplib from 'amqplib';
import { saveAppLog, saveTokenLog, AppLogPayload, TokenLogPayload, LogLevel } from '@/services/repositories/log.service';
import { EXCHANGES } from '@/messaging/events/exchanges';
import { safeConsume } from '@/messaging/utils/consumerHelper';

const QUEUE_NAME = 'user_service_log_queue';
const ROUTING_KEY = 'log.#';

let rabbitMQChannel: amqplib.Channel;

async function handleLogEvent(
  data: any,
  msg: amqplib.ConsumeMessage,
  channel: amqplib.Channel
) {
  const routingKey = msg.fields.routingKey;
  const parts = routingKey.split('.');

  if (parts.length < 3) {
    console.warn(`[SKIP] Invalid routing key: ${routingKey}`);
    return;
  }

  const logType = parts[1];
  const actionOrLevel = parts[2];

  const content = data;

  const validUserId =
    content.userId &&
      content.userId.length === 36 &&
      content.userId !== 'anonymous'
      ? content.userId
      : '11111111-1111-1111-1111-111111111111';

  if (logType === 'token') {
    await saveTokenLog({
      tokenId: content.tokenId,
      userId: content.userId,
      eventType: `${logType}.${actionOrLevel}`,
      success: content.success || false,
      payload: content.payload,
      message: content.message,
      ipAddress: content.ipAddress,
      userAgent: content.userAgent,
    } as TokenLogPayload);

  } else if (logType === 'app') {
    const level = actionOrLevel.toUpperCase() as LogLevel;

    const ipAddress =
      content.ipAddress ||
      content.payload?.ipAddress ||
      '0.0.0.0';

    const userAgent =
      content.userAgent ||
      content.payload?.userAgent ||
      'unknown/v1.0';

    await saveAppLog({
      userId: validUserId,
      level: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(level)
        ? level
        : 'INFO',
      message: content.message || 'Log message missing',
      payload: content.payload || {},
      ipAddress,
      userAgent,
    } as AppLogPayload);

  } else {
    console.warn(`[SKIP] Unknown log type: ${routingKey}`);
  }
}


export async function setupConsumer(channel: amqplib.Channel): Promise<void> {
  rabbitMQChannel = channel;
  channel.prefetch(10);

  const RETRY_EXCHANGE = `${EXCHANGES.LOG}.retry`;

  await channel.assertExchange(EXCHANGES.LOG, "topic", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "topic", { durable: true });

  const q = await channel.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
    },
  });

  await channel.assertQueue(`${QUEUE_NAME}.retry`, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGES.LOG,
    },
  });

  await channel.bindQueue(q.queue, EXCHANGES.LOG, ROUTING_KEY);
  await channel.bindQueue(
    `${QUEUE_NAME}.retry`,
    RETRY_EXCHANGE,
    ROUTING_KEY
  );

  channel.consume(
    q.queue,
    safeConsume(handleLogEvent, channel),
    { noAck: false }
  );

  console.log(`[*] Log Service listening on ${q.queue}`);
}
