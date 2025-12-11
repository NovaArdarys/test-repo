// src/controllers/ai-agent/aiAgent.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { sendToAIAgent } from "@/services/clients/ai.chat.clinet.service";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});

export const chatWithAIAgentHandler = catchAsync(async (c: Context) => {
  const body = await c.req.json();

  const { message } = body;

  if (!message) {
    return c.json(
      { error: "user_id, conversation_id dan message wajib diisi" },
      400
    );
  }

  const payload = {
    user_id: getAuditFields(c).userId,
    conversation_id: "conv456",
    message,
    context: {
      chart_preference: "bar",
      date_range: {
        end: "2024-12-31",
        start: "2026-01-01"
      },
      language: "id",
      timezone: "Asia/Jakarta"
    }
  };

  const start = performance.now();

  const aiResponse = await sendToAIAgent(payload);

  const end = performance.now();
  const processingTime = (end - start) / 1000;

  return c.json({
    success: true,
    payloadSent: payload,
    aiResponse,
    processingTime
  });
});
