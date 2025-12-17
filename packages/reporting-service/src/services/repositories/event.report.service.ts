import { db } from "@/db";
import { eventReports, storage, userDetails, users } from "@/db/schemas";
import { eq, and, desc, sql, gte, lte, getTableColumns, or, inArray } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type EventReport = InferSelectModel<typeof eventReports>;
export type NewEventReport = Omit<
  InferInsertModel<typeof eventReports>,
  "id" | "isDeleted" | "createdAt" | "updatedAt"
> & { createdBy: string; };

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function createEventReport(data: NewEventReport): Promise<EventReport> {
  const [newReport] = await db.insert(eventReports)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return newReport;
}

export async function getEventReportById(id: string) {
  const rows = await db
    .select({
      event: eventReports,
      storage: storage,
      user: users,
      userDetail: userDetails,
    })
    .from(eventReports)
    .leftJoin(
      storage,
      and(
        eq(storage.entityId, eventReports.id),
        inArray(storage.entityType, ["other"] as any)
      )
    )
    .leftJoin(users, eq(users.id, eventReports.createdBy))
    .leftJoin(userDetails, eq(userDetails.userId, users.id))
    .where(eq(eventReports.id, id));

  if (rows.length === 0) return null;

  const event = rows[0].event;

  const grouped = {
    ...event,
    creator: rows[0].user
      ? {
        id: rows[0].user.id,
        email: rows[0].user.email,
        fullName: `${rows[0].userDetail?.firstName ?? null} ${rows[0].userDetail?.lastName ?? null}`,
      }
      : null,
    storages: rows
      .filter((r) => r.storage?.id)
      .map((r) => r.storage),
  };

  return grouped;
}

export async function getEventReports(options?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  reportType?: string;
  kitchenIds: string[];
  beneficiaryIds: string[];
  driversIds: string[];
  subDomains: string[];
  entityType?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const offset = (page - 1) * limit;

  const filters = and(
    eq(eventReports.isDeleted, false),
    options?.startDate ? gte(eventReports.date, options.startDate) : undefined,
    options?.endDate ? lte(eventReports.date, options.endDate) : undefined,
    options?.reportType ? eq(eventReports.reportType, options.reportType) : undefined,
    inArray(eventReports.entityId, options?.kitchenIds)
  );

  console.log(options, "=====options=====", options?.startDate);


  const rows = await db
    .select({
      event: eventReports,
      storage: storage,
      user: users,
      userDetail: userDetails,
    })
    .from(eventReports)
    .leftJoin(
      storage,
      and(
        eq(storage.entityId, eventReports.id),
        inArray(storage.entityType, ["other"] as any)
      )
    )
    .leftJoin(users, eq(users.id, eventReports.createdBy))
    .leftJoin(userDetails, eq(userDetails.userId, users.id))
    .where(filters)
    .orderBy(desc(eventReports.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventReports)
    .where(filters);

  const grouped: Record<string, any> = {};

  rows.forEach((row) => {
    const ev = row.event;
    const key = ev.id;

    if (!grouped[key]) {
      grouped[key] = {
        ...ev,
        creator: row.user
          ? {
            id: row.user.id,
            email: row.user.email,
            fullName: `${row.userDetail?.firstName ?? null} ${row.userDetail?.lastName ?? null}`,
          }
          : null,
        storages: [],
      };
    }

    if (row.storage?.id) {
      grouped[key].storages.push(row.storage);
    }
  });

  const result = Object.values(grouped);

  const meta: PaginationMeta = {
    page,
    limit,
    total: Number(count),
    totalPages: Math.ceil(Number(count) / limit),
  };

  return { data: result, meta };
}

export async function updateEventReport(
  id: string,
  data: Partial<EventReport> & { updatedBy: string; }
): Promise<EventReport | null> {
  const [updated] = await db
    .update(eventReports)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(eventReports.id, id))
    .returning();
  return updated ?? null;
}

export async function softDeleteEventReport(id: string, updatedBy: string): Promise<void> {
  await db
    .update(eventReports)
    .set({
      isDeleted: true,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(eventReports.id, id));
}
