import aiClient from "@/utils/api";
import { EntityType } from "@/validator/storage.validator";
import { ReportResponse } from "../mapper/daily.report.mapper";

/* =========================
 *  TYPES
 * ========================= */
export type AIAnalysisType =
  | "food"
  | "cleanliness"
  | "mealbox"
  | "people-counting"
  | "liveness"
  | "people"
  | "apd"
  | null;

export interface BaseAIInput {
  image: string;
  image_url?: string;
  analysis_type?: AIAnalysisType;
}

export interface DetectInput extends BaseAIInput {
  labels?: Array<{ id: string; en: string; }>;
  image_url?: string;
  analysis_type?: AIAnalysisType;
  food_items?: Array<{ id: string; en: string; }>;
}

type RuleWhen = {
  analysisType?: string;
  entityType?: EntityType | EntityType[];
  stepOrder?: number | number[];
};

type AIRule = {
  when: RuleWhen;
  then: AIAnalysisType;
};

const AI_RULES: AIRule[] = [
  { when: { analysisType: "apd_check" }, then: "apd" },
  { when: { analysisType: "cleanliness" }, then: "cleanliness" },
  { when: { analysisType: "food_detection" }, then: "food" },
  { when: { analysisType: "mealbox_count" }, then: "mealbox" },
];

function matchValue<T>(
  ruleValue: T | T[] | undefined,
  actual: T | undefined
): boolean {
  if (ruleValue === undefined) return true;
  if (actual === undefined) return false;
  return Array.isArray(ruleValue)
    ? ruleValue.includes(actual)
    : ruleValue === actual;
}

function matchRule(
  when: RuleWhen,
  ctx: {
    stepOrder: number;
    entityType: EntityType;
    analysisType?: string;
  }
): boolean {
  return (
    matchValue(when.analysisType, ctx.analysisType) &&
    matchValue(when.entityType, ctx.entityType) &&
    matchValue(when.stepOrder, ctx.stepOrder)
  );
}

export function getAITypeFromStepOrder(
  stepOrder: number,
  entityType: EntityType,
  analysisType?: string
): AIAnalysisType {
  const ctx = { stepOrder, entityType, analysisType };

  const rule = AI_RULES.find((r) => matchRule(r.when, ctx));

  return rule?.then ?? null;
}

export async function detectAI<T extends AIAnalysisType>(
  type: T,
  data: T extends "food" ? DetectInput : BaseAIInput,
  dataInfo: ReportResponse,
): Promise<any> {
  try {
    const payload =
      type === "food"
        ? {
          analysis_type: data.analysis_type,
          image_url: data.image_url,
          food_items: (data as DetectInput).food_items,
        }
        : {
          analysis_type: data.analysis_type,
          image_url: data.image_url,
        };

    const res = await aiClient.post(`/detect/external-vision`, payload);
    const { result, ...rest } = res.data;

    return {
      ...rest,
      data: result,
      info: dataInfo
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `AI fetch failed [${type}]: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    }

    if (error.request) {
      throw new Error(
        `AI fetch no response [${type}]: ${error.message}`
      );
    }

    throw new Error(
      `AI fetch setup error [${type}]: ${error.message}`
    );
  }
}
