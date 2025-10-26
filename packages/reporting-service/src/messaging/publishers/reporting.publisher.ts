import { EXCHANGE_NAME } from "@/constants/config";
import { getRabbitMQChannel } from "../broker";


export async function publishUserRegistered(data: { userId: string, email: string; }) {
  try {
    const channel = getRabbitMQChannel();
    await channel.assertExchange(EXCHANGE_NAME.REPORTING_EVENTS, 'topic', { durable: true });

    channel.publish(
      EXCHANGE_NAME.REPORTING_EVENTS,
      'user.registered',
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`Published UserRegistered event for ID: ${data.userId}`);
  } catch (error) {
    console.error("Failed to publish message:", error);
  }
}