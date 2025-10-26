import { getRabbitMQChannel } from "../broker";
import { EXCHANGES } from "../events/exchanges";
import { logApp, logToken, TokenLogEvent, AppLogEvent } from './log.publisher';


export async function publishUserRegistered(data: { userId: string, email: string; }) {
  try {
    const channel = getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.USER, 'topic', { durable: true });

    channel.publish(
      EXCHANGES.USER,
      'user.registered',
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    await logApp.info({
      userId: data.userId,
      message: `New user successfully registered: ${data.email}.`,
      payload: { event: 'user.registered' }
    } as AppLogEvent);


  } catch (error) {
    console.error("Failed to publish event or log:", error);
  }
}

interface AuthEventData {
  userId: string;
  email: string;
  tokenId: string;
  ipAddress: string;
  deviceInfo: string;
  details?: any;
}

export async function publishUserLoggedIn(data: AuthEventData) {
  try {
    const channel = getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.AUTH, 'topic', { durable: true });

    channel.publish(
      EXCHANGES.AUTH,
      'auth.logged.in',
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    // Log Token Issued (Audit Security)
    await logToken.issued({
      tokenId: data.tokenId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.deviceInfo,
      success: true,
      message: "Access token issued after successful login.",
      payload: data.details
    } as TokenLogEvent);

    // Log Aplikasi (Aktivitas Umum)
    await logApp.info({
      userId: data.userId,
      message: `User '${data.email}' successfully logged in.`,
    } as AppLogEvent);

  } catch (error) {
    console.error("Failed to publish login event or log:", error);
  }
}


export async function publishTokenRefreshed(data: AuthEventData) {
  try {
    const channel = getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.AUTH, 'topic', { durable: true });

    channel.publish(
      EXCHANGES.AUTH,
      'auth.token.refreshed',
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    // Log Token Issued (Audit Security: Token baru dibuat/diperbarui)
    await logToken.issued({
      tokenId: data.tokenId,
      userId: data.userId,
      success: true,
      message: "Access token successfully refreshed.",
      payload: data.details
    } as TokenLogEvent);

  } catch (error) {
    console.error("Failed to publish refresh token event or log:", error);
  }
}


export async function publishUserLoggedOut(data: { userId: string, tokenId: string; }) {
  try {
    const channel = getRabbitMQChannel();

    await channel.assertExchange(EXCHANGES.AUTH, 'topic', { durable: true });

    channel.publish(
      EXCHANGES.AUTH,
      'auth.logged.out',
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    await logToken.revoked({
      tokenId: data.tokenId,
      userId: data.userId,
      success: true,
      message: "Token explicitly revoked by user action (logout).",
    } as TokenLogEvent);

    // Log Aplikasi (Aktivitas Umum)
    await logApp.info({
      userId: data.userId,
      message: `User ${data.userId} successfully logged out.`,
    } as AppLogEvent);


  } catch (error) {
    console.error("Failed to publish logout event or log:", error);
  }
}
