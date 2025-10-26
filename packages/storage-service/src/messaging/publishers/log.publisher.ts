import { getRabbitMQChannel } from '../broker';
import { EXCHANGES } from '../events/exchanges';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface TokenLogEvent {
  tokenId: string;
  userId: string;
  success: boolean;
  message: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
}


export interface AppLogEvent {
  userId?: string;
  message: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
}


async function publishLogEvent(routingKey: string, data: any): Promise<void> {
  try {
    const channel = getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.LOG, 'topic', { durable: true });

    channel.publish(
      EXCHANGES.LOG,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`[LOG PUBLISH] Sent: ${routingKey}`);
  } catch (error) {
    console.error(`[LOG PUBLISH FAILED] Event ${routingKey}:`, error);
  }
}

export type AppLogPublishPayload = {
  userId: string;
  message: string;
  path: string;
  ipAddress: string;
  userAgent: string | undefined;
  payload?: object;
  level?: LogLevel;
};


export async function sendAppLog(level: LogLevel, data: AppLogPublishPayload): Promise<void> {
  try {
    const channel = await getRabbitMQChannel();
    await channel.assertExchange(EXCHANGES.LOG, 'topic', { durable: true });


    const routingKey = `log.app.${level.toLowerCase()}`;

    const success = channel.publish(
      EXCHANGES.LOG,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    if (!success) {
      console.error(`[RABBITMQ] Failed to publish app log to key: ${routingKey}`);
    }

    // await channel.close();

  } catch (error) {
    console.error('[RABBITMQ FATAL] Could not send log message:', error);
  }
}

export const logToken = {
  issued: (data: TokenLogEvent) =>
    publishLogEvent('log.token.issued', data),

  used: (data: TokenLogEvent) =>
    publishLogEvent('log.token.used', data),

  revoked: (data: TokenLogEvent) =>
    publishLogEvent('log.token.revoked', data),
};


export const logApp = {
  debug: (data: AppLogEvent) =>
    publishLogEvent('log.app.debug', data),

  info: (data: AppLogEvent) =>
    publishLogEvent('log.app.info', data),

  warn: (data: AppLogEvent) =>
    publishLogEvent('log.app.warn', data),

  error: (data: AppLogEvent) =>
    publishLogEvent('log.app.error', data),

  fatal: (data: AppLogEvent) =>
    publishLogEvent('log.app.fatal', data),
};
