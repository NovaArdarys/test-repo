// /user-service/src/messaging/consumers/index.ts
import * as amqplib from 'amqplib';
import { setupReportServiceConsumers } from './report.consumer';


export async function initializeConsumers(channel: amqplib.Channel): Promise<void> {
  try {
    console.log("Initializing all message consumers...");

    await setupReportServiceConsumers(channel);


    console.log("All consumers are successfully listening.");

  } catch (error) {
    console.error("Filed to initialize message consumers.", error);
  }
}