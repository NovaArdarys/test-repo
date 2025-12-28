import { db } from "@/db";
import {
  beneficiaries,
  dailyReports,
  deliveries,
  deliveryBeneficiaries,
  masterSteps,
  menuPlans,
  stepReports,
  storage,
} from "@/db/schemas";
import { eq, desc, sql, inArray, and, gte, lte } from "drizzle-orm";
import { getHomeWidgets } from "../additional/widgets.service";

function restructureAgenda(rawAgenda: any[]) {
  return rawAgenda.map((agenda) => {
    const stepMap: Record<string, any> = {};

    for (const delivery of agenda.deliveries) {
      for (const step of delivery.steps ?? []) {
        const stepKey = step.stepKey + "-" + step.portionType; // include portionType
        if (!stepMap[stepKey]) {
          stepMap[stepKey] = {
            id: step.id,
            isCompleted: step.isCompleted,
            stepKey: step.stepKey,
            stepName: step.stepName,
            stepOrder: step.stepOrder,
            portionType: step.portionType,
            deliveries: [],
          };
        }

        stepMap[stepKey].deliveries.push({
          id: delivery.id,
          beneficiary: delivery.beneficiary,
          status: delivery.status,
          deliveredAt: delivery.deliveredAt,
          portionType: delivery.portionType,
          targetPortion: delivery.targetPortion,
          receivedPortion: delivery.receivedPortion,
          takenTray: delivery.takenTray,
          type: delivery.type,
        });
      }
    }

    return {
      ...agenda,
      steps: Object.values(stepMap).sort(
        (a: any, b: any) => a.stepOrder - b.stepOrder
      ),
      deliveries: undefined,
    };
  });
}

export async function getDriverDeliveriesV2(params: {
  domain?: string;
  driverId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  view?: "home" | "calendar" | "delivery" | "report" | "profile";
  subDomains?: string[];
  kitchenIds?: string[];
  schoolIds?: string[];
  driversIds?: string[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const {
    driverId,
    startDate = today,
    endDate = today,
    kitchenIds = [],
    schoolIds = [],
    driversIds = [],
    subDomains = [],
    page = 1,
    limit = 10,
    view,
    domain = "driver",
  } = params;

  const widgets = await getHomeWidgets({
    view,
    domain,
    endDate,
    kitchenIds,
    schoolIds,
    driversIds,
    subDomains,
  });

  const deliveriesRows = await db
    .select({
      deliveryId: deliveries.id,
      portionType: deliveries.portionType,
      menuPlanId: menuPlans.id,
      planName: menuPlans.name,
      planDate: menuPlans.planStartDate,
      beneficiaryId: beneficiaries.id,
      beneficiaryName: beneficiaries.name,
      deliveryStatus: deliveries.status,
      deliveredAt: deliveries.endTime,
      targetPortion: deliveries.targetPortion,
      receivedPortion: deliveries.receivedPortion,
      takenTray: deliveries.takenTray,
      type: deliveries.type,
    })
    .from(deliveries)
    .leftJoin(deliveryBeneficiaries, eq(deliveries.id, deliveryBeneficiaries.deliveryId))
    .leftJoin(menuPlans, eq(deliveryBeneficiaries.menuPlanId, menuPlans.id))
    .leftJoin(beneficiaries, eq(deliveryBeneficiaries.beneficiaryId, beneficiaries.id))
    .where(
      and(
        eq(deliveries.driverId, driverId),
        gte(menuPlans.planStartDate, startDate),
        lte(menuPlans.planStartDate, endDate),
      )
    )
    .orderBy(desc(menuPlans.planStartDate))
    .limit(limit)
    .offset((page - 1) * limit);

  if (!deliveriesRows.length) {
    return {
      data: { agenda: [], ...widgets },
      meta: { page, limit, total: 0, totalPages: 0 },
    };
  }

  /* =========================
     STEP REPORTS (per driver per portionType)
     ========================= */
  const portionTypes = Array.from(new Set(deliveriesRows.map(d => d.portionType)));
  const dailyReportsRows = await db
    .select({
      dailyReportId: dailyReports.id,
      portionType: dailyReports.portionType,
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.entityId, driverId),
        inArray(dailyReports.portionType, portionTypes as any),
        gte(dailyReports.date, startDate),
        lte(dailyReports.date, endDate)
      )
    );

  const dailyReportMap: Record<string, string> = {}; // portionType -> dailyReportId
  dailyReportsRows.forEach(dr => {
    dailyReportMap[dr.portionType as any] = dr.dailyReportId;
  });

  // Ambil semua step report terkait daily report
  const stepsRows = await db
    .select({
      dailyReportId: stepReports.dailyReportId,
      stepId: stepReports.id,
      isCompleted: stepReports.isCompleted,
      notes: stepReports.notes,
      stepKey: masterSteps.stepKey,
      stepName: masterSteps.stepName,
      stepOrder: masterSteps.stepOrder,
      fileUrl: storage.fileUrl,
    })
    .from(stepReports)
    .innerJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .leftJoin(storage, eq(stepReports.id, storage.entityId))
    .where(inArray(stepReports.dailyReportId, Object.values(dailyReportMap)));

  const stepsMap = stepsRows.reduce((acc, s) => {
    if (!acc[s.dailyReportId]) acc[s.dailyReportId] = new Map();

    const map = acc[s.dailyReportId];
    if (!map.has(s.stepId)) {
      map.set(s.stepId, {
        id: s.stepId,
        isCompleted: s.isCompleted,
        notes: s.notes,
        stepKey: s.stepKey,
        stepName: s.stepName,
        stepOrder: s.stepOrder,
        imageURLs: [],
      });
    }

    if (s.fileUrl) {
      const step = map.get(s.stepId);
      if (!step.imageURLs.includes(s.fileUrl)) {
        step.imageURLs.push(s.fileUrl);
      }
    }

    return acc;
  }, {} as Record<string, Map<string, any>>);

  /* =========================
     BUILD AGENDA
     ========================= */
  const agendaMap: Record<string, any> = {};

  for (const row of deliveriesRows) {
    if (!row.menuPlanId) continue;

    if (!agendaMap[row.menuPlanId]) {
      agendaMap[row.menuPlanId] = {
        id: row.menuPlanId,
        date: row.planDate,
        entityType: "driver",
        menuPlan: { id: row.menuPlanId, name: row.planName, date: row.planDate },
        portion: { small: 0, large: 0, total: 0 },
        deliveries: [],
      };
    }

    const dailyReportId = dailyReportMap[row.portionType as any];
    const steps =
      dailyReportId && stepsMap[dailyReportId]
        ? Array.from(stepsMap[dailyReportId].values()).sort(
          (a, b) => a.stepOrder - b.stepOrder
        ).map(step => ({ ...step, portionType: row.portionType })) // attach portionType
        : [];

    agendaMap[row.menuPlanId].deliveries.push({
      id: row.deliveryId,
      beneficiary: { id: row.beneficiaryId, name: row.beneficiaryName },
      status: row.deliveryStatus,
      deliveredAt: row.deliveredAt,
      portionType: row.portionType,
      targetPortion: row.targetPortion,
      receivedPortion: row.receivedPortion,
      takenTray: row.takenTray,
      type: row.type,
      steps,
    });

    if (row.portionType === "SMALL") {
      agendaMap[row.menuPlanId].portion.small += row.targetPortion ?? 0;
    } else if (row.portionType === "LARGE") {
      agendaMap[row.menuPlanId].portion.large += row.targetPortion ?? 0;
    }
    agendaMap[row.menuPlanId].portion.total =
      agendaMap[row.menuPlanId].portion.small + agendaMap[row.menuPlanId].portion.large;
  }

  const agenda = restructureAgenda(Object.values(agendaMap));

  const [{ count }] =
    (await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(deliveries)
      .where(eq(deliveries.driverId, driverId))) || [];

  return {
    data: { agenda, ...widgets },
    meta: { page, limit, total: Number(count) ?? agenda.length, totalPages: Math.ceil((Number(count) ?? agenda.length) / limit) },
  };
}
