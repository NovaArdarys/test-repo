import * as amqplib from 'amqplib';
import { saveAppLog, saveTokenLog, AppLogPayload, TokenLogPayload, LogLevel } from '@/services/repositories/log.service';
import { EXCHANGES } from '@/messaging/events/exchanges';

const QUEUE_NAME = 'user_service_log_queue';
const ROUTING_KEY = 'log.#';

let rabbitMQChannel: amqplib.Channel;

async function handleLogEvent(msg: amqplib.ConsumeMessage | null) {
  if (!msg) return;

  const channel = rabbitMQChannel;
  const routingKey = msg.fields.routingKey;

  const parts = routingKey.split('.');

  if (parts.length < 3) {
    channel.ack(msg);
    return;
  }

  const logType = parts[1];
  const actionOrLevel = parts[2];


  try {
    const content = JSON.parse(msg.content.toString());

    const validUserId = (
      content.userId &&
      content.userId.length === 36 &&
      content.userId !== 'anonymous'
    ) ? content.userId : '11111111-1111-1111-1111-111111111111';

    console.log(`\n[EVENT IN] [${routingKey}] Log received.`, msg.content.toString());

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

      if (!['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(level)) {
        console.warn(`[WARN] Invalid log level '${actionOrLevel}' for key ${routingKey}. Using INFO.`);

        await saveAppLog({
          userId: validUserId,
          level: 'INFO' as LogLevel,
          message: content.message || 'Log message missing (Invalid Level)',
          payload: content.payload || {},
          ipAddress: content.ipAddress || '0.0.0.0',
          userAgent: content.userAgent || 'unknown/v1.0',
        } as AppLogPayload);

      } else {

        const ipAddressMapped = content.ipAddress || content.payload?.ipAddress || '0.0.0.0';
        const userAgentMapped = content.userAgent || content.payload?.userAgent || content.payload?.device?.userAgent || 'unknown/v1.0';

        const finalPayload = {
          ...content.payload,
          ...(content.ipAddress && { oldIpAddress: content.ipAddress }),
          ...(content.userAgent && { oldUserAgent: content.userAgent }),
        };

        await saveAppLog({
          userId: validUserId,
          level: level,
          message: content.message || 'Log message missing (Valid Level)',
          payload: finalPayload,
          ipAddress: ipAddressMapped,
          userAgent: userAgentMapped,
        } as AppLogPayload);
      }

    } else {
      console.warn(`[SKIP] Unknown log type in routing key: ${routingKey}.`);
      channel.ack(msg);
      return;
    }

    channel.ack(msg);

  } catch (error) {
    console.error(`[FATAL LOG CONSUMER ERROR] Failed to process/save ${routingKey}:`, error);
    channel.nack(msg, false, true);
  }
}

export async function setupLogConsumer(channel: amqplib.Channel): Promise<void> {
  rabbitMQChannel = channel;

  await channel.assertExchange(EXCHANGES.LOG, 'topic', { durable: true });

  const q = await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log(`[*] Log Service waiting for events in ${q.queue}`);

  await channel.bindQueue(q.queue, EXCHANGES.LOG, ROUTING_KEY);

  channel.prefetch(10);

  channel.consume(q.queue, handleLogEvent, {
    noAck: false
  });
}
