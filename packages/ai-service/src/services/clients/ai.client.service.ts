import aiClient from "@/utils/api";

export type AIAnalysisType =
  | "food"
  | "cleanliness"
  | "mealbox"
  | "people-counting"
  | "liveness";

export interface BaseAIInput {
  image: string;
}
export interface DetectInput extends BaseAIInput {
  labels?: Array<{ id: string; en: string; }>;
  image: string;
}


export function getAITypeFromStepOrder(stepOrder: number) {
  switch (stepOrder) {
    case 1:
      return "food";
    case 2:
      return "cleanliness";
    case 3:
      return "food";
    case 4:
      return "mealbox";
    default:
      return null;
  }
}

export async function detectAI<T extends AIAnalysisType>(
  type: T,
  data: T extends "food" ? DetectInput : BaseAIInput
): Promise<any> {
  try {
    console.log(data, "========== payload ============", `/detect/${type}`);

    const res = await aiClient.post(`/detect/${type}`, data);
    return res.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `AI fetch failed [${type}]: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    } else if (error.request) {
      throw new Error(`AI fetch no response [${type}]: ${error.message}`);
    } else {
      throw new Error(`AI fetch setup error [${type}]: ${error.message}`);
    }
  }
}
