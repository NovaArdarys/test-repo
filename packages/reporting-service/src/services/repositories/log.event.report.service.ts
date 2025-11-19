import { db } from "@/db";
import { eq, sql, and, between, gte, lte, or, ilike, desc, inArray } from "drizzle-orm";
import { users, userDetails, userRoles, roles } from "@/db/schemas/user.schema";
import { beneficiaries, beneficiaryPortions } from "@/db/schemas/school.schema";
import { kitchens } from "@/db/schemas/kitchen.schema";
import { drivers } from "@/db/schemas/driver.schema";
import { eventReports } from "@/db/schemas";

export async function getEventReportById(eventId: string) {
  const [row] = await db
    .select({
      id: eventReports.id,
      name: eventReports.name,
      reportType: eventReports.reportType,
      date: eventReports.date,
      location: eventReports.location,
      description: eventReports.description,
      entityId: eventReports.entityId,
      createdAt: eventReports.createdAt,
      updatedAt: eventReports.updatedAt,
      createdBy: users.id,
      creatorName: sql<string>`CONCAT(${userDetails.firstName}, ' ', COALESCE(${userDetails.lastName}, ''))`,
      phoneNumber: userDetails.phoneNumber,
      roleName: roles.name,
      roleDomain: roles.domain,
    })
    .from(eventReports)
    .leftJoin(users, eq(eventReports.createdBy, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(eventReports.id, eventId))
    .limit(1);

  if (!row) return null;

  let entityData: any = null;
  let classroomSummary: any = null;

  if (row.roleDomain === "beneficiary" && row.entityId) {
    const classrooms = await db
      .select({
        id: beneficiaryPortions.id,
        name: beneficiaryPortions.name,
        date: beneficiaryPortions.date,
        totalRecipient: beneficiaryPortions.totalRecipient,
        portionType: beneficiaryPortions.portionType,
      })
      .from(beneficiaryPortions)
      .where(
        and(
          eq(beneficiaryPortions.beneficiaryId, row.entityId),
          eq(beneficiaryPortions.isDeleted, false)
        )
      );

    const totalClassroom = classrooms.length;
    const totalStudent = classrooms.reduce(
      (sum, cls) => sum + (cls.totalRecipient ?? 0),
      0
    );

    entityData = await db
      .select({
        id: beneficiaries.id,
        name: beneficiaries.name,
        address: beneficiaries.address,
        phoneNumber: beneficiaries.phoneNumber,
      })
      .from(beneficiaries)
      .where(eq(beneficiaries.id, row.entityId));

    classroomSummary = {
      totalClassroom,
      totalStudent,
      classrooms: classrooms.map((cls) => ({
        id: cls.id,
        name: cls.name,
        date: new Date(cls.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        totalRecipient: cls.totalRecipient,
        portionType: cls.portionType,
      })),
    };
  }

  else if (row.roleDomain === "kitchen" && row.entityId) {
    entityData = await db
      .select({
        id: kitchens.id,
        name: kitchens.name,
        address: kitchens.address,
        phoneNumber: kitchens.phoneNumber,
      })
      .from(kitchens)
      .where(eq(kitchens.id, row.entityId));
  }

  else if (row.roleDomain === "driver" && row.entityId) {
    entityData = await db
      .select({
        id: drivers.id,
        licenseNumber: drivers.licenseNumber,
        kitchenId: drivers.kitchenId,
        isActive: drivers.isActive,
      })
      .from(drivers)
      .where(eq(drivers.id, row.entityId));
  }

  const result = {
    id: row.id,
    name: row.name,
    reportType: row.reportType,
    date: new Date(row.date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    location: row.location ?? "-",
    description: row.description ?? "-",
    createdBy: {
      id: row.createdBy,
      name: row.creatorName ?? "-",
      phoneNumber: row.phoneNumber ?? "-",
      roleName: row.roleName ?? "-",
      domain: row.roleDomain ?? "-",
    },
    entity:
      entityData?.[0] ??
      (row.entityId
        ? { id: row.entityId, note: "Data entity tidak ditemukan" }
        : null),
    classroomSummary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return result;
}


export interface EventReportFilter {
  startDate?: string;
  endDate?: string;
  reportType?: string;
  search?: string;
  page?: number;
  limit?: number;
  kitchenIds?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getEventReportsWithFilter({
  startDate,
  endDate,
  reportType,
  search,
  page = 1,
  limit = 10,
  kitchenIds = []
}: EventReportFilter) {
  const offset = (page - 1) * limit;
  const conditions: any[] = [eq(eventReports.isDeleted, false)];

  if (startDate && endDate) conditions.push(between(eventReports.date, startDate, endDate));
  else if (startDate) conditions.push(gte(eventReports.date, startDate));
  else if (endDate) conditions.push(lte(eventReports.date, endDate));

  if (reportType) conditions.push(eq(eventReports.reportType, reportType));

  if (kitchenIds.length > 0) {
    conditions.push(
      or(
        and(
          inArray(drivers.kitchenId, kitchenIds)
        ),
        and(
          inArray(beneficiaries.kitchenId, kitchenIds)
        ),
        and(
          inArray(eventReports.entityId, kitchenIds)
        )
      )
    );
  }


  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(users.email, like),
        ilike(userDetails.phoneNumber, like),
        sql`CONCAT(${userDetails.firstName}, ' ', COALESCE(${userDetails.lastName}, '')) ILIKE ${like}`,
        ilike(eventReports.name, like),
        ilike(eventReports.location, like)
      )
    );
  }

  const rows = await db
    .select({
      id: eventReports.id,
      name: eventReports.name,
      reportType: eventReports.reportType,
      date: eventReports.date,
      location: eventReports.location,
      description: eventReports.description,
      entityId: eventReports.entityId,
      createdAt: eventReports.createdAt,
      updatedAt: eventReports.updatedAt,
      createdBy: users.id,
      creatorName: sql<string>`CONCAT(${userDetails.firstName}, ' ', COALESCE(${userDetails.lastName}, ''))`,
      phoneNumber: userDetails.phoneNumber,
      roleName: roles.name,
      roleDomain: roles.domain,
    })
    .from(eventReports)
    .leftJoin(users, eq(eventReports.createdBy, users.id))
    .leftJoin(userDetails, eq(users.id, userDetails.userId))
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(drivers, and(
      eq(eventReports.entityId, drivers.id),
    ))
    .leftJoin(beneficiaries, and(
      eq(eventReports.entityId, beneficiaries.id),
    ))
    .leftJoin(kitchens, and(
      eq(eventReports.entityId, kitchens.id),
    ))

    .where(and(...conditions))
    .orderBy(desc(eventReports.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(eventReports)
    .leftJoin(drivers, and(
      eq(eventReports.entityId, drivers.id),
      eq(eventReports.reportType, "driver")
    ))
    .leftJoin(beneficiaries, and(
      eq(eventReports.entityId, beneficiaries.id),
      eq(eventReports.reportType, "beneficiary")
    ))
    .leftJoin(kitchens, and(
      eq(eventReports.entityId, kitchens.id),
      eq(eventReports.reportType, "kitchen")
    ))

    .where(and(...conditions));

  const dataWithClassrooms = await Promise.all(
    rows.map(async (r) => {
      let classroomSummary: any = null;

      if (r.roleDomain === "beneficiary" && r.entityId) {
        const classrooms = await db
          .select({
            id: beneficiaryPortions.id,
            name: beneficiaryPortions.name,
            totalRecipient: beneficiaryPortions.totalRecipient,
            date: beneficiaryPortions.date,
          })
          .from(beneficiaryPortions)
          .where(and(eq(beneficiaryPortions.beneficiaryId, r.entityId), eq(beneficiaryPortions.isDeleted, false)));

        const totalClassroom = classrooms.length;
        const totalStudent = classrooms.reduce((acc, cls) => acc + (cls.totalRecipient ?? 0), 0);

        classroomSummary = {
          totalClassroom,
          totalStudent,
          classrooms: classrooms.map((cls) => ({
            id: cls.id,
            name: cls.name,
            date: new Date(cls.date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
            totalRecipient: cls.totalRecipient,
          })),
        };
      }

      return {
        id: r.id,
        name: r.name,
        reportType: r.reportType,
        date: new Date(r.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        location: r.location ?? "-",
        description: r.description ?? "-",
        createdBy: {
          id: r.createdBy,
          name: r.creatorName ?? "-",
          phoneNumber: r.phoneNumber ?? "-",
          roleName: r.roleName ?? "-",
          domain: r.roleDomain ?? "-",
        },
        classroomSummary,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    })
  );

  const meta: PaginationMeta = {
    page,
    limit,
    total: Number(count),
    totalPages: Math.ceil(Number(count) / limit),
  };

  return { data: dataWithClassrooms, meta };
}
