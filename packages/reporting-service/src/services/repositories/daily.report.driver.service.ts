import { db } from "@/db";
import { beneficiaries, dailyReports, deliveries, deliveryBeneficiaries, masterSteps, menuPlans, stepReports, storage } from "@/db/schemas";
import { addDays } from "date-fns";
import { eq, desc, sql, inArray } from "drizzle-orm";


export async function getDriverDeliveries(params: {
  entityType?: string;
  driverId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  view?: "home" | "calendar" | "delivery" | "report" | "profile";
}) {
  const { driverId, startDate, endDate, page = 1, limit = 10, view, entityType = "driver" } = params;

  let computedEndDate = endDate;
  if (view === "home" && endDate) {
    try {
      computedEndDate = addDays(new Date(endDate), 3).toISOString().split("T")[0];
    } catch {
      computedEndDate = endDate;
    }
  }

  const eventReportsField =
    view === "home"
      ? sql`
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', er.id,
            'name', er.name,
            'reportType', er.report_type,
            'date', er.date,
            'location', er.location,
            'description', er.description
          )
        )
        FROM (
          SELECT er.*
          FROM event_reports er
          WHERE er.is_deleted = false
            ${entityType === "driver" && driverId
          ? sql`AND er.entity_id = ANY(${sql.raw(`ARRAY[${[driverId].map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
            AND er.date >= ${endDate}
            AND er.date <= ${computedEndDate}
          ORDER BY er.date DESC
          LIMIT 3
        ) er
      ), '[]'::jsonb)
    `
      : sql`'[]'::jsonb`;

  const threeDaysMenuField =
    view === "home"
      ? sql`
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'date', t.plan_start_date
          )
        )
        FROM (
          SELECT mp.id, mp.name, mp.plan_start_date
          FROM menu_plans mp
          WHERE mp.is_deleted = false
            ${entityType === "driver" && driverId
          ? sql`AND mp.kitchen_id IN (
                         SELECT uk.kitchen_id
                         FROM user_kitchens uk
                         WHERE uk.user_id = ANY(${sql.raw(`ARRAY[${[driverId].map(id => `'${id}'`).join(",")}]::uuid[]`)})
                           AND uk.is_deleted = false
                       )`
          : sql``
        }
            AND mp.plan_start_date > ${endDate}
            AND mp.plan_start_date <= ${computedEndDate}
          ORDER BY mp.plan_start_date ASC
        ) t
      ), '[]'::jsonb)
    `
      : sql`'[]'::jsonb`;

  let widgets: Record<string, any[]> = {
    threeDaysMenu: [],
    eventReports: [],
  };


  if (view === "home") {
    const [
      threeDaysMenuData,
      eventReportsData,
    ] = await Promise.all([
      db.execute(sql`SELECT (${threeDaysMenuField}) AS "threeDaysMenu"`),
      db.execute(sql`SELECT (${eventReportsField}) AS "eventReports"`),
    ]);

    widgets = {
      threeDaysMenu: threeDaysMenuData?.rows?.[0]?.threeDaysMenu as any ?? [],
      eventReports: eventReportsData?.rows?.[0]?.eventReports as any ?? [],
    };
  }

  const baseQuery = db
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
    })
    .from(deliveries)
    .leftJoin(deliveryBeneficiaries, eq(deliveries.id, deliveryBeneficiaries.deliveryId))
    .leftJoin(menuPlans, eq(deliveryBeneficiaries.menuPlanId, menuPlans.id))
    .leftJoin(beneficiaries, eq(deliveryBeneficiaries.beneficiaryId, beneficiaries.id))
    .where(eq(deliveries.driverId, driverId))
    .orderBy(desc(menuPlans.planStartDate))
    .limit(limit)
    .offset((page - 1) * limit);

  const driverDeliveries = await baseQuery;

  if (driverDeliveries.length === 0) {
    return {
      data: [],
      meta: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const deliveryBeneficiaryIds = driverDeliveries
    .map((d) => d.deliveryBeneficiaryId)
    .filter((id): id is string => id !== null);

  const stepQuery = await db
    .select({
      deliveryBeneficiaryId: dailyReports.entityId,
      dailyReportId: dailyReports.id,
      stepId: stepReports.id,
      createdAt: stepReports.updatedAt,
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

  const stepsBySchool = stepQuery.reduce((acc, s) => {
    if (!acc[s.deliveryBeneficiaryId]) acc[s.deliveryBeneficiaryId] = new Map();
    const stepMap = acc[s.deliveryBeneficiaryId];

    if (!stepMap.has(s.stepId)) {
      stepMap.set(s.stepId, {
        id: s.stepId,
        isCompleted: s.isCompleted,
        notes: s.notes,
        stepKey: s.stepKey,
        stepName: s.stepName,
        stepOrder: s.stepOrder,
        imageURLs: [],
      });
    }

    const step = stepMap.get(s.stepId);
    if (s.fileUrl && !step.imageURLs.includes(s.fileUrl)) {
      step.imageURLs.push(s.fileUrl);
    }

    return acc;
  }, {} as Record<string, Map<string, any>>);

  const groupedByPlan = driverDeliveries.reduce((acc, row) => {
    if (!row.menuPlanId) return acc;

    if (!acc[row.menuPlanId]) {
      acc[row.menuPlanId] = {
        menuPlan: {
          id: row.menuPlanId,
          date: row.planDate,
          name: row.planName,
        },
        delivery: [],
      };
    }

    const steps = row.deliveryBeneficiaryId && stepsBySchool[row.deliveryBeneficiaryId]
      ? Array.from(stepsBySchool[row.deliveryBeneficiaryId].values()).sort(
        (a, b) => a.stepOrder - b.stepOrder
      )
      : [];

    acc[row.menuPlanId].delivery.push({
      id: row.deliveryId,
      school: {
        id: row.beneficiaryId,
        name: row.beneficiaryName,
      },
      status: row.deliveryStatus,
      deliveredAt: row.deliveredAt,
      portionType: row.portionType,
      targetPortion: row.targetPortion,
      receivedPortion: row.receivedPortion,
      takenTray: row.takenTray,
      steps,
    });

    return acc;
  }, {} as Record<string, any>);

  const data = Object.values(groupedByPlan);
  const total = data.length;

  const [{ count }] =
    (await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(deliveries)
      .where(eq(deliveries.driverId, driverId))) || [];

  return {
    data: {
      agenda: data,
      ...widgets
    },
    meta: {
      page,
      limit,
      total: Number(count) ?? Number(total),
      totalPages: Math.ceil((count ?? total) / limit),
    },
  };
}

