import { getRabbitMQChannel } from "../broker";

const EXCHANGE_NAME = 'user_events';

export async function publishUserRegistered(data: { userId: string, email: string; }) {
  try {
    const channel = getRabbitMQChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    channel.publish(
      EXCHANGE_NAME,
      'user.registered',
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`Published UserRegistered event for ID: ${data.userId}`);
  } catch (error) {
    console.error("Failed to publish message:", error);
  }
}