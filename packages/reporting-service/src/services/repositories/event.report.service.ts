import { db } from "@/db";
import { eventReports, storage, userDetails, users } from "@/db/schemas";
import { eq, and, desc, sql, gte, lte, getTableColumns, or, inArray } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { buildDomainFilter } from "./web/utils/event.report.domain.filter.service";
import { publishStorageDelete } from "@/messaging/publishers/reporting.publisher";

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
  const [rows, storageRows] = await Promise.all([
    db
      .select({ event: eventReports, user: users, userDetail: userDetails })
      .from(eventReports)
      .leftJoin(users, eq(users.id, eventReports.createdBy))
      .leftJoin(userDetails, eq(userDetails.userId, users.id))
      .where(eq(eventReports.id, id)),
    db
      .select({
        id: storage.id,
        fileName: storage.fileName,
        meta: storage.meta,
        fileUrl: storage.fileUrl,
        mimeType: storage.mimeType,
        size: storage.size,
        createdAt: storage.createdAt,
        createdBy: storage.createdBy,
        entityType: storage.entityType
      })
      .from(storage)
      .where(eq(storage.entityId, id)),
  ]);

  if (rows.length === 0) return null;

  return {
    ...rows[0].event,
    creator: rows[0].user
      ? {
        id: rows[0].user.id,
        email: rows[0].user.email,
        fullName: `${rows[0].userDetail?.firstName ?? null} ${rows[0].userDetail?.lastName ?? null}`,
      }
      : null,
    storages: storageRows,
  };
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
  domain?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const offset = (page - 1) * limit;

  const filters = and(
    eq(eventReports.isDeleted, false),
    options?.startDate ? gte(eventReports.date, options.startDate) : undefined,
    options?.endDate ? lte(eventReports.date, options.endDate) : undefined,
    options?.reportType ? eq(eventReports.reportType, options.reportType) : undefined,
    buildDomainFilter(options));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventReports)
    .where(filters);

  const paginatedIds = await db
    .select({ id: eventReports.id })
    .from(eventReports)
    .where(filters)
    .orderBy(desc(eventReports.createdAt))
    .limit(limit)
    .offset(offset);

  const eventIds = paginatedIds.map((e) => e.id);

  if (eventIds.length === 0) {
    return {
      data: [],
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }

  const storageSelect = {
    id: storage.id,
    fileName: storage.fileName,
    meta: storage.meta,
    fileUrl: storage.fileUrl,
    mimeType: storage.mimeType,
    size: storage.size,
    createdAt: storage.createdAt,
    createdBy: storage.createdBy,
  };

  const [eventRows, storageRows] = await Promise.all([
    db
      .select({ event: eventReports, user: users, userDetail: userDetails })
      .from(eventReports)
      .leftJoin(users, eq(users.id, eventReports.createdBy))
      .leftJoin(userDetails, eq(userDetails.userId, users.id))
      .where(inArray(eventReports.id, eventIds))
      .orderBy(desc(eventReports.createdAt)),
    db
      .select({ ...storageSelect, entityId: storage.entityId })
      .from(storage)
      .where(inArray(storage.entityId, eventIds)),
  ]);

  const storagesByEventId: Record<string, any[]> = {};
  storageRows.forEach(({ entityId, ...s }) => {
    if (!entityId) return;
    if (!storagesByEventId[entityId]) storagesByEventId[entityId] = [];
    storagesByEventId[entityId].push(s);
  });

  const grouped: Record<string, any> = {};
  eventRows.forEach((row) => {
    const ev = row.event;
    grouped[ev.id] = {
      ...ev,
      creator: row.user
        ? {
          id: row.user.id,
          email: row.user.email,
          fullName: `${row.userDetail?.firstName ?? null} ${row.userDetail?.lastName ?? null}`,
        }
        : null,
      storages: storagesByEventId[ev.id] ?? [],
    };
  });

  const result = eventIds.map((id) => grouped[id]).filter(Boolean);

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

export async function linkStoragesToEventReport(storageIds: string[], entityId: string, entityType: string): Promise<void> {
  if (!storageIds.length) return;
  await db.update(storage)
    .set({ entityId, entityType })
    .where(inArray(storage.id, storageIds));
}

export async function syncStoragesForEventReport(
  eventReportId: string,
  newStorageIds: string[],
  entityType: string
): Promise<void> {
  const existing = await db
    .select({ id: storage.id, path: storage.path })
    .from(storage)
    .where(eq(storage.entityId, eventReportId));

  const existingIds = existing.map((s) => s.id);
  const toDelete = existing.filter((s) => !newStorageIds.includes(s.id));
  const toLink = newStorageIds.filter((id) => !existingIds.includes(id));

  await Promise.all([
    toDelete.length
      ? Promise.all([
        db.delete(storage).where(inArray(storage.id, toDelete.map((s) => s.id))),
        publishStorageDelete({ storageIds: toDelete.map((s) => s.id), paths: toDelete.map((s) => s.path) }),
      ])
      : Promise.resolve(),
    toLink.length
      ? db.update(storage).set({ entityId: eventReportId, entityType }).where(inArray(storage.id, toLink))
      : Promise.resolve(),
  ]);
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


