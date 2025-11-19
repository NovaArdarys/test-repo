import { db } from "@/db";
import { and, between, eq, ilike, sql, gte, lte, or, desc } from "drizzle-orm";// pastikan import sesuai struktur project kamu
import { users, userDetails, userRoles, roles } from "@/db/schemas/user.schema";
import { roleDomainEnum } from "@/db/schemas/enums/enums";
import z from "zod";
import { dailyReports, masterSteps, beneficiaryPortions, stepReports, beneficiaries, drivers, kitchens, storage } from "@/db/schemas";
import { isEmpty } from "lodash";

const entityTypeValidator = z.enum(roleDomainEnum.enumValues);

export interface StepReportFilter {
  startDate?: string;
  endDate?: string;
  search?: string;
  entity?: z.infer<typeof entityTypeValidator>;
  page?: number;
  limit?: number;
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
}: StepReportFilter): Promise<{ data: StepReportResult[]; meta: PaginationMeta; }> {
  const offset = (page - 1) * limit;
  const conditions: any[] = [];

  if (startDate && endDate) conditions.push(between(dailyReports.date, startDate, endDate));
  else if (startDate) conditions.push(gte(dailyReports.date, startDate));
  else if (endDate) conditions.push(lte(dailyReports.date, endDate));

  if (search && search != 'undefined') {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(users.email, like),
        ilike(userDetails.phoneNumber, like),
        sql`CONCAT(${userDetails.firstName}, ' ', COALESCE(${userDetails.lastName}, '')) ILIKE ${like}`
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
    storages: row.storageId
      ? [
        {
          id: row.storageId,
          imageURL: row.imageURL ?? null,
          metadata: row.metadata ?? null,
        },
      ]
      : [],
    entityType: row.entityType,
    entitySummary: entitySummary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return result;
}
