import { db } from "@/db";
import { beneficiaries, dailyReports, deliveries, deliveryBeneficiaries, masterSteps, menuPlans, stepReports, storage } from "@/db/schemas";
import { addDays } from "date-fns";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { getHomeWidgets } from "./additional/widgets.service";


export async function getDriverDeliveries(params: {
  entityType?: string;
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
    entityType = "driver",
  } = params;

  const toISO = (d: Date) => d.toISOString().split("T")[0];

  const widgets = await getHomeWidgets({
    view,
    entityType,
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
      deliveryBeneficiaryId: deliveryBeneficiaries.id,
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
    .leftJoin(
      deliveryBeneficiaries,
      eq(deliveries.id, deliveryBeneficiaries.deliveryId),
    )
    .leftJoin(menuPlans, eq(deliveryBeneficiaries.menuPlanId, menuPlans.id))
    .leftJoin(
      beneficiaries,
      eq(deliveryBeneficiaries.beneficiaryId, beneficiaries.id),
    )
    .where(eq(deliveries.driverId, driverId))
    .orderBy(desc(menuPlans.planStartDate))
    .limit(limit)
    .offset((page - 1) * limit);

  if (deliveriesRows.length === 0) {
    return {
      data: {
        agenda: [],
        ...widgets,
      },
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const deliveryBeneficiaryIds = deliveriesRows
    .map((d) => d.deliveryBeneficiaryId)
    .filter((v): v is string => Boolean(v));

  const stepsRows = await db
    .select({
      deliveryBeneficiaryId: dailyReports.entityId,
      stepId: stepReports.id,
      isCompleted: stepReports.isCompleted,
      notes: stepReports.notes,
      stepKey: masterSteps.stepKey,
      stepName: masterSteps.stepName,
      stepOrder: masterSteps.stepOrder,
      fileUrl: storage.fileUrl,
    })
    .from(dailyReports)
    .innerJoin(stepReports, eq(dailyReports.id, stepReports.dailyReportId))
    .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .leftJoin(storage, eq(stepReports.id, storage.entityId))
    .where(inArray(dailyReports.entityId, deliveryBeneficiaryIds));

  const stepsMap = stepsRows.reduce((acc, s) => {
    if (!acc[s.deliveryBeneficiaryId]) acc[s.deliveryBeneficiaryId] = new Map();

    const map = acc[s.deliveryBeneficiaryId];
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

  const agendaMap: Record<string, any> = {};

  for (const row of deliveriesRows) {
    if (!row.menuPlanId) continue;

    if (!agendaMap[row.menuPlanId]) {
      agendaMap[row.menuPlanId] = {
        id: row.menuPlanId,
        date: row.planDate,
        entityType: "driver",
        menuPlan: {
          id: row.menuPlanId,
          name: row.planName,
          date: row.planDate,
        },
        portion: {
          small: 0,
          large: 0,
          total: 0,
        },
        deliveries: [],
      };
    }

    const steps =
      row.deliveryBeneficiaryId && stepsMap[row.deliveryBeneficiaryId]
        ? Array.from(stepsMap[row.deliveryBeneficiaryId].values()).sort(
          (a, b) => a.stepOrder - b.stepOrder,
        )
        : [];

    agendaMap[row.menuPlanId].deliveries.push({
      id: row.deliveryId,
      beneficiary: {
        id: row.beneficiaryId,
        name: row.beneficiaryName,
      },
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
      agendaMap[row.menuPlanId].portion.small +
      agendaMap[row.menuPlanId].portion.large;
  }

  const agenda = Object.values(agendaMap);

  const [{ count }] =
    (await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(deliveries)
      .where(eq(deliveries.driverId, driverId))) || [];

  return {
    data: {
      agenda,
      ...widgets,
    },
    meta: {
      page,
      limit,
      total: Number(count) ?? agenda.length,
      totalPages: Math.ceil((Number(count) ?? agenda.length) / limit),
    },
  };
}


