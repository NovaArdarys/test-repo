import { db } from "@/db";
import { and, between, eq, ilike, sql, gte, lte, or, desc, inArray } from "drizzle-orm";// pastikan import sesuai struktur project kamu
import { users, userDetails, userRoles, roles } from "@/db/schemas/user.schema";
import { roleDomainEnum } from "@/db/schemas/enums/enums";
import z from "zod";
import { dailyReports, masterSteps, beneficiaryPortions, stepReports, beneficiaries, drivers, kitchens, storage, menuPlans, menuPlanBeneficiaries, deliveryBeneficiaries, deliveries } from "@/db/schemas";
import { castArray, isEmpty } from "lodash";
import { aiAnalysisLogs } from "@/db/schemas/ai.log.schema";

const entityTypeValidator = z.enum(roleDomainEnum.enumValues);

export interface StepReportFilter {
  startDate?: string;
  endDate?: string;
  search?: string;
  entity?: z.infer<typeof entityTypeValidator>;
  page?: number;
  limit?: number;
  kitchenIds: string[];
  isAppManager: boolean;
}

export interface StepReportResult {
  id: string;
  date: string;
  stepName: string;
  name: string;
  roleName: string;
  phoneNumber: string;
  dailyReport: {
    id: string;
    entityType: string;
    status: string;
    menuPlanId: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getGroupDailyReportService({
  startDate,
  endDate,
  kitchenIds,
  isAppManager,
  page = 1,
  limit = 20,
  entity,
}: StepReportFilter) {
  const offset = (page - 1) * limit;
  const conditions: any[] = [];

  console.log(kitchenIds, "=====kitchenIds====");

  if (startDate && endDate) conditions.push(between(dailyReports.date, startDate, endDate));
  if (startDate && !endDate) conditions.push(gte(dailyReports.date, startDate));
  if (!startDate && endDate) conditions.push(lte(dailyReports.date, endDate));

  if (!isAppManager && kitchenIds?.length) {
    conditions.push(
      and(entity ? eq(dailyReports.entityType, entity as any) : undefined,
        or(
          inArray(kitchens.id, kitchenIds),
          inArray(beneficiaries.kitchenId, kitchenIds),
          inArray(drivers.kitchenId, kitchenIds)
        )
      )
    );
  }

  const rows = await db
    .select({
      id: dailyReports.id,
      date: dailyReports.date,
      entityType: dailyReports.entityType,
      portionType: dailyReports.portionType,
      entityId: dailyReports.entityId,
      menuPlanId: dailyReports.menuPlanId,
      status: dailyReports.status,

      kitchenName: kitchens.name,
      beneficiaryName: beneficiaries.name,
      driverName: userDetails.firstName
    })
    .from(dailyReports)
    .leftJoin(kitchens, eq(dailyReports.entityId, kitchens.id))
    .leftJoin(beneficiaries, eq(dailyReports.entityId, beneficiaries.id))
    .leftJoin(drivers, eq(dailyReports.entityId, drivers.id))
    .leftJoin(users, eq(drivers.userId, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .where(and(...conditions))
    .orderBy(desc(dailyReports.date))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dailyReports)
    .leftJoin(kitchens, eq(dailyReports.entityId, kitchens.id))
    .leftJoin(beneficiaries, eq(dailyReports.entityId, beneficiaries.id))
    .leftJoin(drivers, eq(dailyReports.entityId, drivers.id))
    .leftJoin(users, eq(drivers.userId, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .where(and(...conditions));

  const list = rows.map(r => ({
    id: r.id,
    date: r.date,
    entityType: r.entityType,
    portionType: r.portionType,
    entityName:
      r.entityType === "kitchen" ? r.kitchenName :
        r.entityType === "beneficiary" ? r.beneficiaryName :
          r.entityType === "driver" ? r.driverName : "-",
    status: r.status
  }));

  return {
    data: list,
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit)
    }
  };
}

export async function getGroupDailyReportDetailService(dailyReportId: string) {

  const [dr] = await db
    .select({
      id: dailyReports.id,
      date: dailyReports.date,
      entityType: dailyReports.entityType,
      entityId: dailyReports.entityId,
      status: dailyReports.status,
      menuPlanId: dailyReports.menuPlanId,

      kitchenName: kitchens.name,
      kitchenPhone: kitchens.phoneNumber,

      beneName: beneficiaries.name,
      beneAddress: beneficiaries.address,

      driverUserId: drivers.userId,
      driverKitchenId: drivers.kitchenId
    })
    .from(dailyReports)
    .leftJoin(kitchens, eq(dailyReports.entityId, kitchens.id))
    .leftJoin(beneficiaries, eq(dailyReports.entityId, beneficiaries.id))
    .leftJoin(drivers, eq(dailyReports.entityId, drivers.id))
    .where(eq(dailyReports.id, dailyReportId))
    .limit(1);

  if (!dr) return null;

  const steps = await db
    .select({
      id: stepReports.id,
      stepName: masterSteps.stepName,
      stepOrder: masterSteps.stepOrder,
      stepKey: masterSteps.stepKey,
      notes: stepReports.notes,
      isCompleted: stepReports.isCompleted,
      imageURL: stepReports.imageURL,
      storageId: stepReports.storageId
    })
    .from(stepReports)
    .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .where(eq(stepReports.dailyReportId, dailyReportId))
    .orderBy(masterSteps.stepOrder);


  const storageRecords = await db
    .select({
      id: storage.id,
      entityId: storage.entityId,
      imageURL: storage.fileUrl,
      metadata: storage.meta,

      aiAnalysis: sql`
        COALESCE(
          json_agg(
            json_build_object(
              'analysisType', ${aiAnalysisLogs.analysisType},
              'input', ${aiAnalysisLogs.input},
              'output', ${aiAnalysisLogs.output},
              'processingTime', ${aiAnalysisLogs.processingTime},
              'threshold', ${aiAnalysisLogs.threshold}
            )
          ) FILTER (WHERE ${aiAnalysisLogs.id} IS NOT NULL),
          '[]'::json
        )
      `.as("aiAnalysis"),
    })
    .from(storage)
    .leftJoin(aiAnalysisLogs, eq(aiAnalysisLogs.storageId, storage.id))
    .where(inArray(storage.entityId, steps.map(s => s.id)))
    .groupBy(storage.id);

  const storageMap = new Map(storageRecords.map(s => [s.entityId, s]));


  const stepsWithStorage = steps.map(s => {
    const storageItem = storageMap.get(s.id);

    return {
      ...s,
      storages: storageItem
        ? [
          {
            id: storageItem.id,
            imageURL: storageItem.imageURL,
            metadata: storageItem.metadata,
            aiAnalysis: storageItem.aiAnalysis
          }
        ]
        : []
    };
  });


  const entitySummary =
    dr.entityType === "kitchen"
      ? { name: dr.kitchenName, phone: dr.kitchenPhone }
      : dr.entityType === "beneficiary"
        ? { name: dr.beneName, address: dr.beneAddress }
        : dr.entityType === "driver"
          ? { userId: dr.driverUserId, kitchenId: dr.driverKitchenId }
          : null;


  return {
    id: dr.id,
    date: new Date(dr.date).toLocaleDateString("id-ID"),
    entityType: dr.entityType,
    entitySummary,

    steps: stepsWithStorage
  };
}
