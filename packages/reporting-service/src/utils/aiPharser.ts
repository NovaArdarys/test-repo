// ========================================================
// GROUP ENTRY: RAW STEPS → SUBDOMAIN GROUP
// ========================================================

export function buildUIReport(rawSteps: any[], menuItems: any[] = []) {
  const grouped = groupBySubDomain(rawSteps);

  return grouped.map((domain: any) => ({
    name: domain.subDomain,
    steps: domain.steps.map((step: any) =>
      buildUIStepFromStepLevel(step, menuItems)
    ),
  }));
}

// ========================================================
// GROUP STEPS BY SUBDOMAIN + ORDER BY stepOrder
// ========================================================

export function groupBySubDomain(steps: any[]) {
  const grouped: Record<string, any> = {};

  for (const step of steps) {
    const key = step.subDomain;

    if (!grouped[key]) {
      grouped[key] = {
        subDomain: key,
        steps: [],
      };
    }

    grouped[key].steps.push({
      id: step.id,
      stepName: step.stepName,
      stepOrder: step.stepOrder ?? 999,
      imageURL: step.imageURL,
      storageId: step.storageId,
      createdAt: step.createdAt,
      storageMeta: normalizeMeta(step.storageMeta),
      storageCreatedBy: step.storageCreatedBy,
      storageCreatedAt: step.storageCreatedAt,
      ai: step.ai,
    });
  }

  Object.keys(grouped).forEach((key) =>
    grouped[key].steps.sort((a: any, b: any) => a.stepOrder - b.stepOrder)
  );

  return Object.values(grouped);
}

// ========================================================
// STEP LEVEL BUILDER
// ========================================================

export function buildUIStepFromStepLevel(step: any, menuItems: any[]) {
  const ai = step.aiResult ?? [];

  console.log(step, "=======s=======", step.aiResult);

  if (step.stepName === "APD") {
    return buildAPDStep(step, ai);
  }

  if (step.stepName === "Kebersihan Sebelum") {
    return buildCleanlinessStep(step, ai, "before");
  }

  if (step.stepName === "Kebersihan Sesudah") {
    return buildCleanlinessStep(step, ai, "after");
  }

  if (step.stepName === "Foto Menu") {
    return buildServingStep(step, ai, menuItems);
  }

  return {
    type: "unknown",
    title: step.stepName,
    image: step.imageURL,
    timestamp: step.createdAt,
    storageMeta: normalizeMeta(step.storageMeta),
    storageCreatedBy: step.storageCreatedBy,
    storageCreatedAt: step.storageCreatedAt,
    status: false,
  };
}

// ========================================================
// APD STEP BUILDER
// ========================================================

function buildAPDStep(step: any, ai: any[]) {
  const found = ai.filter((a: any) => a.type === "apd_check");

  const persons = found.flatMap((a: any) => a.output?.data?.persons ?? []);

  const nonCompliant = persons.filter((p: any) => !p.is_compliant).length;

  const status = found.length > 0
    ? nonCompliant === 0
    : false;

  return {
    type: "apd",
    title: "Seragam APD",
    image: step.imageURL ?? null,
    timestamp: step.createdAt ?? null,
    status,
    storageMeta: normalizeMeta(step.storageMeta),
    storageCreatedBy: step.storageCreatedBy,
    storageCreatedAt: step.storageCreatedAt,
    aiResult: buildAPDItems(persons, found.length > 0),
  };
}

const APD_LABEL_MAP: Record<string, string> = {
  Mask: "Masker",
  Hairnet: "Topi Rambut",
  Glove: "Sarung Tangan",
  Apron: "Celemek",
};

function buildAPDItems(persons: any[], aiFound: boolean) {
  const REQUIRED = ["Mask", "Hairnet", "Glove", "Apron"];

  if (!aiFound) {
    return REQUIRED.map((key) => ({
      label: APD_LABEL_MAP[key],
      status: false,
    }));
  }

  const missing = persons.flatMap(
    (p: any) => p.apd_missing?.map((m: any) => m.toLowerCase()) ?? []
  );

  return REQUIRED.map((key) => ({
    label: APD_LABEL_MAP[key],
    status: !missing.includes(key.toLowerCase()),
  }));
}

// ========================================================
// CLEANLINESS STEP BUILDER
// ========================================================

function buildCleanlinessStep(step: any, ai: any[], pos: "before" | "after") {
  const found = ai.filter((a: any) => a.type === "cleanliness");

  const score = found[0]?.output?.data?.dirty_score ?? 0;
  const clean = found[0]?.output?.data?.final_status === "Clean";

  const status = found.length > 0
    ? clean
    : false;

  return {
    type: `cleanliness_${pos}`,
    title: pos === "before" ? "Kebersihan Sebelum" : "Kebersihan Sesudah",
    image: step.imageURL ?? null,
    timestamp: step.createdAt ?? null,
    storageMeta: normalizeMeta(step.storageMeta),
    storageCreatedBy: step.storageCreatedBy,
    storageCreatedAt: step.storageCreatedAt,
    aiResult: {
      status, score,
      scoreLabel:
        score > 80 ? "Baik" :
          score > 50 ? "Cukup" :
            "Buruk",
    }
  };
}

// ========================================================
// SERVING STEP BUILDER
// ========================================================

function buildServingStep(step: any, ai: any[], menuItems: any[]) {
  const found = ai.filter((a: any) => a.type === "food_detection");

  const aiDetectedRaw = found.flatMap((a: any) => a.output?.data?.detected ?? []);
  const aiMissingRaw = found.flatMap((a: any) => a.output?.data?.not_found ?? []);

  const aiDetected = aiDetectedRaw.map((d: any) => d.name.toLowerCase());
  const aiMissing = aiMissingRaw.map((d: any) => d.toLowerCase());

  const menu = menuItems.map((m: any) => ({
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    type: m.type,
  }));

  const menuNames = menu.map((m: any) => m.name.toLowerCase());

  const notMatched = menuNames
    .filter((item) => !aiDetected.includes(item))
    .map((name) => menu.find((m: any) => m.name.toLowerCase() === name));

  const extraDetected = aiDetected
    .filter((item) => !menuNames.includes(item))
    .map((name) => ({
      name,
      extra: true
    }));

  const status = found.length > 0
    ? notMatched.length === 0 && extraDetected.length === 0
    : false;

  return {
    type: "serving",
    title: "Foto Menu",
    image: step.imageURL ?? null,
    timestamp: step.createdAt ?? null,
    storageMeta: normalizeMeta(step.storageMeta),
    storageCreatedBy: step.storageCreatedBy,
    storageCreatedAt: step.storageCreatedAt,
    status,
    aiResult: {
      planned: menu,
      detected: aiDetectedRaw,
      missing: notMatched,
      extra: extraDetected,
    }
  };
}

export function calculateStatus(domains: any[]) {
  return domains.every((domain: any) =>
    domain.steps.every((step: any) => step.status === true)
  );
}


function normalizeMeta(meta: any) {
  if (!meta) return {};

  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }

  if (typeof meta === "object") return meta;

  return {};
}
