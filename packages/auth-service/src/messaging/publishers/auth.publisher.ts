import { safePublish } from "../utils/publisherHelper";
import { EXCHANGES } from "../events/exchanges";
import { logApp, logToken, TokenLogEvent, AppLogEvent } from "./log.publisher";


/**
 * publish log user register
 *
 * @export
 * @param {{ userId: string; email: string; }} data
 */
export async function publishUserRegistered(data: { userId: string; email: string; }) {
  try {
    await safePublish(EXCHANGES.USER, "user.registered", data);

    await logApp.info({
      userId: data.userId,
      message: `New user successfully registered: ${data.email}.`,
      payload: { event: "user.registered" },
    } as AppLogEvent);
  } catch (error) {
    console.error("❌ Failed to publish user.registered event or log:", error);
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

/**
 * user login
 *
 * @export
 * @param {AuthEventData} data
 */
export async function publishUserLoggedIn(data: AuthEventData) {
  try {
    await safePublish(EXCHANGES.AUTH, "auth.logged.in", data);

    // Log Token Issued (Audit Security)
    await logToken.issued({
      tokenId: data.tokenId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.deviceInfo,
      success: true,
      message: "Access token issued after successful login.",
      payload: data.details,
    } as TokenLogEvent);

    // Log Aplikasi (Aktivitas Umum)
    await logApp.info({
      userId: data.userId,
      message: `User '${data.email}' successfully logged in.`,
    } as AppLogEvent);
  } catch (error) {
    console.error("❌ Failed to publish auth.logged.in event or log:", error);
  }
}


/**
 * user request refresh token
 *
 * @export
 * @param {AuthEventData} data
 */
export async function publishTokenRefreshed(data: AuthEventData) {
  try {
    await safePublish(EXCHANGES.AUTH, "auth.token.refreshed", data);

    // Log Token Issued (Audit Security: Token baru dibuat/diperbarui)
    await logToken.issued({
      tokenId: data.tokenId,
      userId: data.userId,
      success: true,
      message: "Access token successfully refreshed.",
      payload: data.details,
    } as TokenLogEvent);
  } catch (error) {
    console.error("❌ Failed to publish auth.token.refreshed event or log:", error);
  }
}

/**
 * user logout 
 *
 * @export
 * @param {{ userId: string; tokenId: string; }} data
 */
export async function publishUserLoggedOut(data: { userId: string; tokenId: string; }) {
  try {
    await safePublish(EXCHANGES.AUTH, "auth.logged.out", data);

    // Log Token Revoked
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
    console.error("❌ Failed to publish auth.logged.out event or log:", error);
  }
}
