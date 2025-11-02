import { EXCHANGES } from "../events/exchanges";
import { safePublish } from "../utils/publisherHelper";

export async function publishTrack(data: { email: string, password: string; }) {
  try {
    await safePublish(EXCHANGES.TRACK, "track.start", data);
    console.log(`Published ${data.email}`);
  } catch (error) {
    console.error("Failed to publish message:", error);
  }
}