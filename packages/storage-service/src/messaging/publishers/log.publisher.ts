import { safePublish } from "../utils/publisherHelper";
import { EXCHANGES } from "../events/exchanges";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

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

export type AppLogPublishPayload = {
  userId: string;
  message: string;
  path: string;
  ipAddress: string;
  userAgent?: string;
  payload?: object;
  level?: LogLevel;
};

/**
 * publishLogEvent - helper untuk semua event log berbasis routing key
 */
async function publishLogEvent(routingKey: string, data: any): Promise<void> {
  try {
    await safePublish(EXCHANGES.LOG, routingKey, data);
    console.log(`[LOG PUBLISH] ✅ Sent: ${routingKey}`);
  } catch (error) {
    console.error(`[LOG PUBLISH FAILED] ❌ ${routingKey}:`, error);
  }
}

/**
 * sendAppLog - kirim log aplikasi dengan level tertentu
 */
export async function sendAppLog(level: LogLevel, data: AppLogPublishPayload): Promise<void> {
  const routingKey = `log.app.${level.toLowerCase()}`;
  try {
    await safePublish(EXCHANGES.LOG, routingKey, data);
    console.log(`[LOG PUBLISH] ✅ App log sent with level ${level}`);
  } catch (error) {
    console.error(`[RABBITMQ FATAL] ❌ Could not send app log:`, error);
  }
}

/**
 * logToken - helper group untuk log event token
 */
export const logToken = {
  issued: (data: TokenLogEvent) => publishLogEvent("log.token.issued", data),
  used: (data: TokenLogEvent) => publishLogEvent("log.token.used", data),
  revoked: (data: TokenLogEvent) => publishLogEvent("log.token.revoked", data),
};

/**
 * logApp - helper group untuk log event aplikasi
 */
export const logApp = {
  debug: (data: AppLogEvent) => publishLogEvent("log.app.debug", data),
  info: (data: AppLogEvent) => publishLogEvent("log.app.info", data),
  warn: (data: AppLogEvent) => publishLogEvent("log.app.warn", data),
  error: (data: AppLogEvent) => publishLogEvent("log.app.error", data),
  fatal: (data: AppLogEvent) => publishLogEvent("log.app.fatal", data),
};
