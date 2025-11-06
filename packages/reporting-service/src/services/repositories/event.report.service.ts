import { db } from "@/db";
import { eventReports } from "@/db/schemas";
import { eq, and, desc, sql } from "drizzle-orm";
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

export async function getEventReportById(id: string): Promise<EventReport | null> {
  const report = await db.query.eventReports.findFirst({
    where: (er, { eq }) => eq(er.id, id),
  });
  return report ?? null;
}

export async function getEventReports(options?: {
  page?: number;
  limit?: number;
  date?: string;
  reportType?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const offset = (page - 1) * limit;

  const filters = and(
    eq(eventReports.isDeleted, false),
    options?.date ? eq(eventReports.date, options.date) : undefined,
    options?.reportType ? eq(eventReports.reportType, options.reportType) : undefined
  );

  const data = await db
    .select()
    .from(eventReports)
    .where(filters)
    .orderBy(desc(eventReports.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventReports)
    .where(filters);

  const meta: PaginationMeta = {
    page,
    limit,
    total: Number(count),
    totalPages: Math.ceil(Number(count) / limit),
  };

  return { data, meta };
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
