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

export async function getStepReportsWithFilter({
  startDate,
  endDate,
  search,
  entity,
  page = 1,
  limit = 20,
  kitchenIds,
  isAppManager
}: StepReportFilter): Promise<{ data: StepReportResult[]; meta: PaginationMeta; }> {
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  console.log(isAppManager, kitchenIds, "=====kitchenIds====");

  if (startDate && endDate) conditions.push(between(dailyReports.date, startDate, endDate));
  else if (startDate) conditions.push(gte(dailyReports.date, startDate));
  else if (endDate) conditions.push(lte(dailyReports.date, endDate));


  const kitchenIdsNormalized = castArray(kitchenIds).filter(Boolean);

  if (!isAppManager && kitchenIdsNormalized?.length) {
    conditions.push(
      or(
        inArray(menuPlans.kitchenId, kitchenIdsNormalized),
        inArray(beneficiaries.kitchenId, kitchenIdsNormalized),
        inArray(drivers.kitchenId, kitchenIdsNormalized),
        and(
          eq(dailyReports.entityType, "kitchen"),
          inArray(dailyReports.entityId, kitchenIdsNormalized)
        )
      )
    );
  }


  const filters = and(...conditions);

  const rows = await db
    .select({
      id: stepReports.id,
      date: dailyReports.date,
      stepName: masterSteps.stepName,
      name: sql<string>`CONCAT(${userDetails.firstName}, ' ', COALESCE(${userDetails.lastName}, ''))`,
      roleName: roles.name,
      phoneNumber: userDetails.phoneNumber,
      dailyReportId: dailyReports.id,
      dailyEntityType: dailyReports.entityType,
      dailyStatus: dailyReports.status,
      menuPlanId: dailyReports.menuPlanId,
      storageId: stepReports.storageId,
      imageURL: stepReports.imageURL,
    })
    .from(stepReports)
    .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .leftJoin(dailyReports, eq(stepReports.dailyReportId, dailyReports.id))
    .leftJoin(users, eq(stepReports.updatedBy, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(menuPlans, eq(dailyReports.menuPlanId, menuPlans.id))
    .leftJoin(menuPlanBeneficiaries, eq(menuPlanBeneficiaries.menuPlanId, menuPlans.id))
    .leftJoin(beneficiaries, eq(menuPlanBeneficiaries.beneficiaryId, beneficiaries.id))
    .leftJoin(deliveryBeneficiaries, eq(dailyReports.entityId, deliveryBeneficiaries.id))
    .leftJoin(deliveries, eq(deliveryBeneficiaries.deliveryId, deliveries.id))
    .leftJoin(drivers, eq(deliveries.driverId, drivers.id))
    .where(filters)
    .orderBy(desc(dailyReports.date))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stepReports)
    .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .leftJoin(dailyReports, eq(stepReports.dailyReportId, dailyReports.id))
    .leftJoin(users, eq(stepReports.updatedBy, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(menuPlans, eq(dailyReports.menuPlanId, menuPlans.id))
    .leftJoin(menuPlanBeneficiaries, eq(menuPlanBeneficiaries.menuPlanId, menuPlans.id))
    .leftJoin(beneficiaries, eq(menuPlanBeneficiaries.beneficiaryId, beneficiaries.id))
    .leftJoin(deliveryBeneficiaries, eq(dailyReports.entityId, deliveryBeneficiaries.id))
    .leftJoin(deliveries, eq(deliveryBeneficiaries.deliveryId, deliveries.id))
    .leftJoin(drivers, eq(deliveries.driverId, drivers.id))
    .where(filters);

  const meta: PaginationMeta = {
    page,
    limit,
    total: Number(count),
    totalPages: Math.ceil(Number(count) / limit),
  };

  const grouped = new Map<string, StepReportResult>();

  for (const r of rows) {
    if (!grouped.has(r.id)) {
      grouped.set(r.id, {
        id: r.id,
        date: new Date(r?.date || "").toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        stepName: r.stepName ?? "-",
        name: !isEmpty(r?.name?.trim()) ? r.name : "-",
        roleName: r.roleName ?? "-",
        phoneNumber: r.phoneNumber ?? "-",
        dailyReport: {
          id: r.dailyReportId || "",
          entityType: r.dailyEntityType || "",
          status: r.dailyStatus || "",
          menuPlanId: r.menuPlanId || "",
        },
      });
    }
  }
  return {
    data: Array.from(grouped.values()),
    meta,
  };
}

export async function getStepReportById(stepId: string) {
  const [row] = await db
    .select({
      id: stepReports.id,
      notes: stepReports.notes,
      isCompleted: stepReports.isCompleted,
      createdAt: stepReports.createdAt,
      updatedAt: stepReports.updatedAt,
      date: dailyReports.date,
      stepName: masterSteps.stepName,
      stepOrder: masterSteps.stepOrder,
      stepKey: masterSteps.stepKey,
      entityId: dailyReports.entityId,
      entityType: dailyReports.entityType,
      status: dailyReports.status,
      menuPlanId: dailyReports.menuPlanId,
      createdBy: users.id,
      creatorName: sql<string>`CONCAT(${userDetails.firstName}, ' ', COALESCE(${userDetails.lastName}, ''))`,
      phoneNumber: userDetails.phoneNumber,
      roleName: roles.name,
      roleDomain: roles.domain,
      storageId: stepReports.storageId,
      imageURL: stepReports.imageURL,
      metadata: storage.meta,
    })
    .from(stepReports)
    .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .leftJoin(storage, eq(stepReports.storageId, storage.id))
    .leftJoin(dailyReports, eq(stepReports.dailyReportId, dailyReports.id))
    .leftJoin(users, eq(stepReports.createdBy, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(stepReports.id, stepId))
    .limit(1);

  if (!row) return null;

  const storageData = await db
    .select({
      id: storage.id,
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
    .where(eq(storage.entityId, row.id))
    .groupBy(storage.id);



  let entitySummary: any = null;

  switch (row.entityType) {
    case "beneficiary":
    case "kitchen":
    case "driver":
  }

  if (row.entityType === "beneficiary" && row.entityId) {
    const b = await db
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.id, row.entityId as any),
          eq(beneficiaries.isDeleted, false)
        )
      )
      .limit(1);

    const beneficiary = b[0];

    entitySummary = {
      id: beneficiary.id,
      name: beneficiary.name,
      address: beneficiary.address,
      category: beneficiary.category,
      phoneNumber: beneficiary.phoneNumber,
      provinceId: beneficiary.provinceId,
      regencyId: beneficiary.regencyId,
      districtId: beneficiary.districtId,
      villageId: beneficiary.villageId,
      imageUrl: beneficiary.imageUrl,
      joinedDate: beneficiary.joinedDate,
      smallPortion: beneficiary.smallPortion,
      largePortion: beneficiary.largePortion,
      status: beneficiary.status,
    };
  }


  if (row.entityType === "kitchen" && row.entityId) {
    const k = await db
      .select()
      .from(kitchens)
      .where(
        and(
          eq(kitchens.id, row.entityId as any),
          eq(kitchens.isDeleted, false)
        )
      )
      .limit(1);

    const kitchen = k[0];

    entitySummary = {
      id: kitchen.id,
      name: kitchen.name,
      address: kitchen.address,
      status: kitchen.status,
      joinDate: kitchen.joinDate,
      phoneNumber: kitchen.phoneNumber,
      provinceId: kitchen.provinceId,
      regencyId: kitchen.regencyId,
      districtId: kitchen.districtId,
      villageId: kitchen.villageId,
      imageURL: kitchen.imageURL,
    };
  }


  if (row.entityType === "driver" && row.entityId) {
    const d = await db
      .select({
        id: drivers.id,
        userId: drivers.userId,
        kitchenId: drivers.kitchenId,
        licenseNumber: drivers.licenseNumber,
        isActive: drivers.isActive,
        createdAt: drivers.createdAt,
        updatedAt: drivers.updatedAt,
      })
      .from(drivers)
      .where(
        and(
          eq(drivers.id, row.entityId as any),
          eq(drivers.isDeleted, false)
        )
      )
      .limit(1);

    const driverData = d[0];

    const user = await db.query.users.findFirst({
      where: eq(users.id, driverData.userId),
    });

    entitySummary = {
      id: driverData.id,
      user: user ? { id: user.id, email: user.email } : null,
      name: user?.email ?? "",
      kitchenId: driverData.kitchenId,
      licenseNumber: driverData.licenseNumber,
      isActive: driverData.isActive,
      createdAt: driverData.createdAt,
      updatedAt: driverData.updatedAt,
    };
  }

  const storages = [...storageData];

  if (row.storageId) {
    const storageData = await db
      .select({
        id: storage.id,
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
      .where(eq(storage.entityId, row.id))
      .groupBy(storage.id);


    storages.push({
      id: row.storageId,
      imageURL: row.imageURL ?? "",
      metadata: row.metadata ?? {},
      aiAnalysis: storageData
    });
  }


  const result = {
    id: row.id,
    name: row.stepName,
    key: row.stepKey,
    order: row.stepOrder,
    notes: row.notes,
    isCompleted: row.isCompleted,
    date: new Date(row.date || "").toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    dailyReport: {
      id: row.id,
      entityType: row.entityType,
      status: row.status,
      menuPlanId: row.menuPlanId,
    },
    createdBy: {
      id: row.createdBy,
      name: row.creatorName ?? "-",
      phoneNumber: row.phoneNumber ?? "-",
      roleName: row.roleName ?? "-",
      domain: row.roleDomain ?? "-",
    },
    storages: storages,
    entityType: row.entityType,
    entitySummary: entitySummary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return result;
}
