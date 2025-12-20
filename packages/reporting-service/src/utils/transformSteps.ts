import { orderBy } from "lodash";
import { computeAIStatus } from "./aiScore.utils";

export interface StepItem {
  id: string;
  isCompleted: boolean;
  notes: string | null;
  stepKey: string;
  stepName: string;
  stepOrder: number;
  subDomain: string | null;
  imageURL: string | null;
  createdAt: string;
  ai: any[]; // raw AI data
}

export interface StepGroup {
  domain: string;
  status: "OK" | "FAIL" | "PENDING";
  steps: Array<StepItem & { aiStatus: any; }>;
}

export function transformSteps(rawSteps: StepItem[]): StepGroup[] {
  if (!rawSteps?.length) return [];

  const sorted = orderBy(rawSteps, "stepOrder", "asc");

  const enriched = sorted.map((step) => {
    const { ai, ...stepData } = step;
    return ({
      ...stepData,
      aiStatus: computeAIStatus(ai ?? []),
    });
  });

  const domainMap = new Map<string, any[]>();

  enriched.forEach((step) => {
    const domain = step.subDomain ?? "unknown";

    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain)!.push(step);
  });

  const result: StepGroup[] = Array.from(domainMap.entries()).map(
    ([domain, steps]) => {
      const statuses = steps.map((s: any) => s.aiStatus.status);

      let domainStatus: StepGroup["status"] = "PENDING";

      if (statuses.includes("FAIL")) domainStatus = "FAIL";
      else if (statuses.includes("OK")) domainStatus = "OK";

      return {
        domain,
        status: domainStatus,
        steps,
      };
    }
  );

  return result;
}

export function computeDomainStatusFromOutput(ai: any, domain: string) {
  if (!ai?.output) return false;

  const output = ai.output;
  const type = ai.type;

  //
  // 🔥 DOMAIN: APD
  //
  if (domain.toLowerCase().includes("apd")) {
    const nonCompliant = output?.data?.non_compliant_count ?? null;
    if (nonCompliant === null) return false;
    return nonCompliant === 0;
  }

  //
  // 🔥 DOMAIN: KEBERSIHAN
  //
  if (domain.toLowerCase().includes("kebersihan")) {
    const dirtyScore = output?.data?.dirty_score ?? null;
    if (dirtyScore === null) return false;
    return dirtyScore < 30;
  }

  //
  // 🔥 DOMAIN: FOOD DETECTION
  //
  if (type === "food_detection") {
    const missing = output?.data?.not_found?.length ?? null;
    if (missing === null) return false;
    return missing === 0;
  }

  //
  // 🔥 FALLBACK DOMAIN (PERSIAPAN / PEMORSIAN)
  //
  if (output.error) return false;
  return true;
}

export function computeStepStatusFromAllAI(step: any, domain: string) {
  const aiList = step.ai ?? [];

  // jika tidak ada AI sama sekali = FAIL
  if (!aiList.length) return false;

  const results = aiList.map((ai: any) =>
    computeDomainStatusFromOutput(ai, domain)
  );

  // jika ada satu fail → FAIL
  if (results.includes(false)) return false;

  // jika semua ok → OK
  return true;
}

export function groupStepsByDomain(rawSteps: any[]) {
  if (!rawSteps?.length) return [];

  const domainMap = new Map<string, any[]>();

  rawSteps.forEach((step: any) => {
    const domain = step.subDomain ?? "Tanpa Domain";

    const status = computeStepStatusFromAllAI(step, domain);

    const stepImages = [
      ...(step?.ai ?? [])
        .map((ai: any) => ({
          imageURL: ai.output_image_url ?? ai.thumbnail ?? null,
          storageId: ai.storageId ?? null,
        }))
        .filter((s: any) => s.imageURL),

      {
        imageURL: step.imageURL ?? null,
        storageId: step.storageId ?? null,
      },
    ].filter((s) => s.imageURL);


    const stepData = {
      id: step.id,
      name: step.stepName,
      status,
      storages: stepImages,
    };

    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }

    domainMap.get(domain)!.push(stepData);
  });

  return Array.from(domainMap.entries()).map(([domain, steps]) => {
    const domainStatus = steps.every((s) => s.status === true);

    const domainImages = steps
      .flatMap((s: any) => s.storages ?? [])
      .filter((x: any) => x.imageURL);

    return {
      domain,
      status: domainStatus,
      steps,
      storages: domainImages,
    };
  });
}