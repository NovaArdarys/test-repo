import apiAiAgent from "@/utils/apiAiAgent";
import { AxiosError } from "axios";

export interface ChatPayload {
  user_id: string;
  conversation_id: string;
  message: string;
  context: {
    chart_preference?: string;
    date_range?: {
      start: string;
      end: string;
    };
    language?: string;
    timezone?: string;
  };
}

export async function sendToAIAgent(payload: ChatPayload) {
  try {
    const res = await apiAiAgent.post(
      "/chat/",
      payload
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError;

    if (e.response) {
      throw new Error(
        `AI Agent error: ${e.response.status} - ${JSON.stringify(e.response.data)}`
      );
    }
    throw new Error(`AI Agent request failed: ${e.message}`);
  }
}
