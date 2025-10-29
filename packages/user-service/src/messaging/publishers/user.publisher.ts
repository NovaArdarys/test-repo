import { getRabbitMQChannel } from "../broker";
import { EXCHANGES } from "../events/exchanges";


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
    console.log(`Published UserRegistered event for ID: ${data.userId}`);
  } catch (error) {
    console.error("Failed to publish message:", error);
  }
}