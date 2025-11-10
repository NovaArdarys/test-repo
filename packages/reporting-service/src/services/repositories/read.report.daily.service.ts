import { db } from "@/db";
import { and, between, eq, ilike, sql, gte, lte, or, desc } from "drizzle-orm";// pastikan import sesuai struktur project kamu
import { users, userDetails, userRoles, roles } from "@/db/schemas/user.schema";
import { roleDomainEnum } from "@/db/schemas/enums/enums";
import z from "zod";
import { dailyReports, masterSteps, stepReports } from "@/db/schemas";

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

  if (entity) conditions.push(eq(roles.domain, entity));

  if (search) {
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
    .leftJoin(users, eq(stepReports.createdBy, users.id))
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
    .leftJoin(dailyReports, eq(stepReports.dailyReportId, dailyReports.id))
    .leftJoin(users, eq(stepReports.createdBy, users.id))
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
        name: r.name ?? "-",
        roleName: r.roleName ?? "Tidak Diketahui",
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
