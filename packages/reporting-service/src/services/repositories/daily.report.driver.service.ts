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

  const driverDeliveries = await db
    .select({
      delivery: deliveries,
      deliverySchool: deliverySchools,
      menuPlan: menuPlans,
      school: schools,
    })
    .from(deliveries)
    .leftJoin(deliverySchools, eq(deliveries.id, deliverySchools.deliveryId))
    .leftJoin(menuPlans, eq(deliverySchools.menuPlanId, menuPlans.id))
    .leftJoin(schools, eq(deliverySchools.schoolId, schools.id))
    .where(eq(deliveries.driverId, driverId))
    .orderBy(desc(menuPlans.planStartDate))
    .limit(limit)
    .offset((page - 1) * limit);

  const grouped = new Map();

  for (const row of driverDeliveries) {
    const planId = row?.menuPlan?.id;
    if (!grouped.has(planId)) {
      grouped.set(planId, {
        menuPlan: {
          id: planId,
          date: row?.menuPlan?.planStartDate,
          name: row?.menuPlan?.name,
          foodItems: [],
        },
        deliverySchools: [],
      });
    }

    const [dailyReport] = await db
      .select()
      .from(dailyReports)
      .where(row?.deliverySchool?.id ? eq(dailyReports.entityId, row?.deliverySchool?.id) : undefined);

    const stepList = await db
      .select({
        step: stepReports,
        stepMeta: masterSteps,
        file: storage,
      })
      .from(stepReports)
      .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
      .leftJoin(storage, eq(stepReports.id, storage.entityId))
      .where(eq(stepReports.dailyReportId, dailyReport.id));

    const stepMap = new Map();
    for (const s of stepList) {
      const sid = s.step.id;
      if (!stepMap.has(sid)) {
        stepMap.set(sid, {
          id: sid,
          isCompleted: s.step.isCompleted,
          notes: s.step.notes,
          stepKey: s?.stepMeta?.stepKey,
          stepName: s?.stepMeta?.stepName,
          stepOrder: s?.stepMeta?.stepOrder,
          imageURLs: [],
        });
      }
      const step = stepMap.get(sid);
      if (s.file?.fileUrl && !step.imageURLs.includes(s.file.fileUrl)) {
        step.imageURLs.push(s.file.fileUrl);
      }
    }

    grouped.get(planId).deliverySchools.push({
      id: row?.deliverySchool?.id,
      school: {
        id: row?.school?.id,
        name: row?.school?.name,
      },
      status: row?.deliverySchool?.status,
      deliveredAt: row?.deliverySchool?.deliveredAt,
      steps: Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder),
    });
  }

  return {
    data: Array.from(grouped.values()),
    meta: {
      page,
      limit,
      total: grouped.size,
      totalPages: Math.ceil(grouped.size / limit),
    },
  };
}
