import { db } from "@/db";
import { dailyReports, deliveries, deliverySchools, foodItems, masterSteps, menuFoodItem, menuPlans, menuPlanSchools, schoolClassroom, stepReports, storage, suppliers, suppliersFoodItems } from "@/db/schemas";
import { kitchens, drivers, schools } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { buildPaginatedWhere } from "@/utils/pagination";
import { eq, and, desc, InferInsertModel, InferSelectModel, between, gte, lte, sql, inArray, SQLWrapper } from "drizzle-orm";
import { isEmpty, orderBy } from "lodash";


export async function getDriverDeliveries(params: {
  driverId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { driverId, startDate, endDate, page = 1, limit = 10 } = params;

  const eventReportsField = sql`
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
        WHERE er.entity_id = ${driverId}
          AND er.report_type = 'driver'
          AND er.is_deleted = false
        ORDER BY er.date DESC
        LIMIT 3
      ) er
    ), '[]'::jsonb)
  `.as("eventReports");

  const threeDaysMenuField = sql`
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', mp.id,
          'name', mp.name,
          'date', mp.plan_start_date
        )
      )
      FROM menu_plans mp
      WHERE mp.kitchen_id = (
        SELECT uk.kitchen_id
        FROM user_kitchens uk
        WHERE uk.user_id = ${driverId}
          AND uk.is_deleted = false
        LIMIT 1
      )
        AND mp.is_deleted = false
        AND mp.plan_start_date > menuPlans.plan_start_date
        AND mp.plan_start_date <= menuPlans.plan_start_date + INTERVAL '3 days'
      ORDER BY mp.plan_start_date ASC
    ), '[]'::jsonb)
  `.as("threeDaysMenu");

  const baseQuery = db
    .select({
      deliveryId: deliveries.id,
      deliverySchoolId: deliverySchools.id,
      menuPlanId: menuPlans.id,
      planName: menuPlans.name,
      planDate: menuPlans.planStartDate,
      schoolId: schools.id,
      schoolName: schools.name,
      deliveryStatus: deliverySchools.status,
      deliveredAt: deliverySchools.deliveredAt,
      eventReports: eventReportsField,
      threeDaysMenu: threeDaysMenuField,
    })
    .from(deliveries)
    .leftJoin(deliverySchools, eq(deliveries.id, deliverySchools.deliveryId))
    .leftJoin(menuPlans, eq(deliverySchools.menuPlanId, menuPlans.id))
    .leftJoin(schools, eq(deliverySchools.schoolId, schools.id))
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

  const deliverySchoolIds = driverDeliveries
    .map((d) => d.deliverySchoolId)
    .filter((id): id is string => id !== null);

  const stepQuery = await db
    .select({
      deliverySchoolId: dailyReports.entityId,
      dailyReportId: dailyReports.id,
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
    .where(inArray(dailyReports.entityId, deliverySchoolIds));

  const stepsBySchool = stepQuery.reduce((acc, s) => {
    if (!acc[s.deliverySchoolId]) acc[s.deliverySchoolId] = new Map();
    const stepMap = acc[s.deliverySchoolId];

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
        eventReports: row.eventReports,
        threeDaysMenu: row.threeDaysMenu,
      };
    }

    const steps = row.deliverySchoolId && stepsBySchool[row.deliverySchoolId]
      ? Array.from(stepsBySchool[row.deliverySchoolId].values()).sort(
        (a, b) => a.stepOrder - b.stepOrder
      )
      : [];

    acc[row.menuPlanId].delivery.push({
      id: row.deliveryId,
      school: {
        id: row.schoolId,
        name: row.schoolName,
        portion: 0
      },
      status: row.deliveryStatus,
      deliveredAt: row.deliveredAt,
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
    data,
    meta: {
      page,
      limit,
      total: count ?? total,
      totalPages: Math.ceil((count ?? total) / limit),
    },
  };
}

