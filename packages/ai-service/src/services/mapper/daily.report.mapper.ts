export interface ReportResponse {
  id: string | null;
  stepId: string | null;
  dailyReportId: string | null;
  subDomain: string | null;
  imageURL: string | null;
  storageId: string | null;
  updatedAt: string | null;

  storage: {
    meta: string | null;
  };

  updatedByUser: {
    email: string | null;
    userDetails: {
      name: string | null;
    } | null;
  } | null;

  dailyReport: {
    id: string | null;
    date: string | null;
    menuPlan: {
      id: string | null;
      name: string | null;
      planStartDate: string | null;
      planEndDate: string | null;
      foodItem: {
        name: string | null;
        nameEn: string | null;
        ingredients: any[];
      } | null;
    } | null;
  } | null;

  kitchen: {
    name: string | null;
    lon: string | null;
    lat: string | null;
    address: string | null;
  } | null;

  step: {
    stepKey: string | null;
    stepName: string | null;
    stepOrder: number | null;
    entityType: string | null;
    analysisType: string | null;
  } | null;
}

export function mapReport(raw: any): ReportResponse {
  const foodItem =
    raw?.dailyReport?.menuPlan?.menuFoodItem?.[0]?.foodItem;

  const kitchen = raw?.dailyReport?.menuPlan?.menuPlankitchen;

  return {
    id: raw?.id ?? null,
    stepId: raw?.stepId ?? null,
    dailyReportId: raw?.dailyReportId ?? null,
    subDomain: raw?.subDomain ?? null,
    imageURL: raw?.imageURL ?? null,
    storageId: raw?.storageId ?? null,
    updatedAt: raw?.updatedAt ?? null,

    storage: raw?.storage,

    updatedByUser: raw?.updatedByUser
      ? {
        email: raw.updatedByUser?.email ?? null,
        userDetails: raw.updatedByUser?.userDetails
          ? {
            name:
              [
                raw.updatedByUser.userDetails?.firstName,
                raw.updatedByUser.userDetails?.lastName,
              ]
                .filter(Boolean)
                .join(" ") || null,
          }
          : null,
      }
      : null,

    dailyReport: raw?.dailyReport
      ? {
        id: raw.dailyReport?.id ?? null,
        date: raw.dailyReport?.date ?? null,
        menuPlan: raw.dailyReport?.menuPlan
          ? {
            id: raw.dailyReport.menuPlan?.id ?? null,
            name: raw.dailyReport.menuPlan?.name ?? null,
            planStartDate:
              raw.dailyReport.menuPlan?.planStartDate ?? null,
            planEndDate:
              raw.dailyReport.menuPlan?.planEndDate ?? null,
            foodItem: foodItem
              ? {
                name: foodItem?.name ?? null,
                nameEn: foodItem?.nameEn ?? null,
                ingredients: foodItem?.ingredients ?? [],
              }
              : null,
          }
          : null,
      }
      : null,

    kitchen: kitchen
      ? {
        name: kitchen?.name ?? null,
        lon: kitchen?.lon ?? null,
        lat: kitchen?.lat ?? null,
        address: kitchen?.address ?? null,
      }
      : null,

    step: raw?.step
      ? {
        stepKey: raw.step?.stepKey ?? null,
        stepName: raw.step?.stepName ?? null,
        stepOrder: raw.step?.stepOrder ?? null,
        entityType: raw.step?.entityType ?? null,
        analysisType: raw.step?.analysisType ?? null,
      }
      : null,
  };
}