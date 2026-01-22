import { SUB_DOMAIN_ORDER } from "@/services/repositories/additional/step.order.service";

type NormalizedStep = {
  id: string;
  isCompleted: boolean | null;
  notes: string | null;
  imageURL: string | null;
  createdAt: Date;
  subDomain: string | null;
  stepKey: string;
  stepName: string;
  stepOrder: number;
};


export const buildOrderedDomainSteps = (steps: NormalizedStep[]) => {
  const grouped = steps.reduce((acc, step) => {
    const key = step.subDomain ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(step);
    return acc;
  }, {} as Record<string, NormalizedStep[]>);

  return Object.entries(grouped)
    .map(([subDomain, items]) => {
      const firstIncomplete = items
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .find(item => item.isCompleted !== true);

      const allCompleted = !firstIncomplete;
      return ({
        subDomain,
        isCompleted: allCompleted,
        orderStep: SUB_DOMAIN_ORDER[subDomain] ?? 999,
        steps: items.sort((a, b) => a.stepOrder - b.stepOrder),
      });
    })
    .sort((a, b) => a.orderStep - b.orderStep);
};