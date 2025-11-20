import { detectAI, getAITypeFromStepOrder } from "@/services/clients/ai.client.service";
import { getStepReportDetail, insertAiLog } from "@/services/repositories/ai.service";
import { compressImageToBase64 } from "@/utils/imageCompress";
import { catchAsync } from "@/utils/catchAsync";
import { Context } from "hono";

export const analyzeData = catchAsync(async (c: Context) => {
  const body = await c.req.json();

  const { entityId, entityType, url } = body;

  const start = performance.now();
  let labels: any[] = [];
  let aiType: any = null;

  if (!url) {
    return c.json({ error: "image url required" }, 400);
  }

  if (entityId) {
    const stepReport = await getStepReportDetail(entityId);

    if (!stepReport?.step) {
      return c.json({ error: "Step report not found or missing step data" }, 404);
    }

    console.log(stepReport.step.entityType, "====a====");

    aiType = getAITypeFromStepOrder(stepReport.step.stepOrder, entityType);

    if (!aiType) {
      return c.json({ message: "AI type not applicable for this step" }, 200);
    }

    labels =
      aiType === "food"
        ? stepReport.dailyReport?.menuPlan?.menuFoodItem
          ?.map((item) => ({
            id: item.foodItem?.name?.trim() || "",
            en: item.foodItem?.nameEn?.trim() || item.foodItem?.name?.trim() || "",
          }))
          ?.filter((l) => l.id && l.en)
        : [];

    if (aiType === "food" && labels.length === 0) {
      return c.json({ error: "No valid food labels found for AI request" }, 400);
    }
  }

  if (!entityId) {
    aiType = entityType === "profile" ? "people" : "food";
    labels = [{ id: "", en: "" }];
  }

  const image = await compressImageToBase64(url);

  const result = await detectAI(aiType!, {
    image,
    labels: labels.map((l) => ({
      id: l.id || "",
      en: l.en || "",
    })),
  });

  const end = performance.now();
  const processingTime = (end - start) / 1000;

  await insertAiLog({
    entityId: entityId ?? null,
    analysisType:
      aiType === "food"
        ? "food_detection"
        : aiType === "cleanliness"
          ? "cleanliness"
          : aiType === "people"
            ? "people_count"
            : "mealbox_count",
    sourceImageUrl: url,
    outputImageUrl: result?.output_image ?? null,
    processingTime: String(processingTime),
    threshold: result?.threshold ?? null,
    output: result,
    input: { labels },
    metadata: {
      aiURL: `/detect/${aiType}`,
      mode: "controller",
      timestamp: new Date().toISOString(),
    },
  });

  return c.json({
    success: true,
    aiType,
    processingTime,
    labels,
    result,
  });
});
