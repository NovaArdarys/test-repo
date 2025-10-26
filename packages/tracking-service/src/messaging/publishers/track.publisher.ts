import { getRabbitMQChannel } from "../broker";
import { EXCHANGES } from "../events/exchanges";
import { ROUTING_KEYS } from "../events/routingKeys";

export async function publishTrack(data: { email: string, password: string; }) {
  try {
    const channel = getRabbitMQChannel();
    await channel.assertExchange(EXCHANGES.AUTH, 'topic', { durable: true });

    channel.publish(
      EXCHANGES.TRACK,
      ROUTING_KEYS.TRACK.ALL,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`Published UserRegistered event for ID: ${data.email}`);
  } catch (error) {
    console.error("Failed to publish message:", error);
  }
}