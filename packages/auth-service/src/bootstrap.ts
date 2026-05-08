import { connectRabbitMQ } from './messaging/broker';
import { initializeConsumers } from './messaging/consumers';

/**
 * Initialises RabbitMQ connection and all consumers.
 * Extracted from index.ts to keep the entry-point file clean.
 *
 * NOTE on reconnect behaviour: connectRabbitMQ() only asserts the primary
 * exchange (EXCHANGES.AUTH) at startup. Additional exchanges asserted by
 * consumers/publishers (e.g. EXCHANGES.USER, EXCHANGES.LOG) are handled
 * inside initializeConsumers() — which is called once at startup.
 * On a spontaneous reconnect (connection.on("close") → setTimeout(connectRabbitMQ, 5000))
 * those consumer-level exchanges are NOT re-asserted automatically.
 * This is acceptable for the current architecture but should be addressed in
 * a future iteration by making each consumer re-assert its own exchange after
 * connectRabbitMQ() resolves.
 */
export async function bootstrap(): Promise<void> {
  try {
    console.log('Starting application initialization...');

    const channel = await connectRabbitMQ();

    console.log('RabbitMQ connected and ready.');

    await initializeConsumers(channel);

    console.log('All RabbitMQ Consumers are successfully listening.');
  } catch (error) {
    console.error('🚨 FATAL ERROR: Application setup failed. Exiting...', error);
    process.exit(1);
  }
}
