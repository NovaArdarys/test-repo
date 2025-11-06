import { db } from "@/db";
import { eventReports } from "@/db/schemas";
import { eq, and, desc, asc, InferInsertModel, InferSelectModel } from "drizzle-orm";

export type EventReport = InferSelectModel<typeof eventReports>;

export type NewEventReport = Omit<
  InferInsertModel<typeof eventReports>,
  "id" | "isDeleted" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
> & { createdBy: string; };


export async function createEventReport(data: NewEventReport): Promise<EventReport> {
  const [newReport] = await db.insert(eventReports)
    .values({
      ...data,
      createdBy: data.createdBy,
    })
    .returning();
  return newReport;
}


export async function getEventReportById(id: string): Promise<EventReport | null> {
  const report = await db.query.eventReports.findFirst({
    where: (er, { eq, and }) => and(
      eq(er.id, id),
      eq(er.isDeleted, false)
    ),
  });
  return report ?? null;
}


export async function getEventReports(options?: {
  date?: string;
  reportType?: string;
}): Promise<EventReport[]> {
  const reports = await db.query.eventReports.findMany({
    where: (er, { eq, and }) =>
      and(
        eq(er.isDeleted, false),
        options?.date ? eq(er.date, options.date) : undefined,
        options?.reportType ? eq(er.reportType, options.reportType) : undefined,
      ),
    orderBy: (er, { desc }) => desc(er.createdAt),
  });

  return reports;
}


export async function updateEventReport(
  id: string,
  data: Partial<Omit<EventReport, "id" | "createdAt" | "createdBy">> & { updatedBy: string; }
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
