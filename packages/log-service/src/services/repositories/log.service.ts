import { appLogs, tokenLogs } from "@/db/schemas";
import { db } from "@/db";
import { and, desc, eq, InferSelectModel, sql, SQLWrapper } from "drizzle-orm";
import { APIPagination } from "@/types/paginations.type";


export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type AppLog = InferSelectModel<typeof appLogs>;
export type TokenLog = InferSelectModel<typeof tokenLogs>;

export interface AppLogPayload {
  userId?: string;
  level: LogLevel;
  message: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
}

export interface TokenLogPayload {
  tokenId: string;
  userId: string;
  eventType: string;
  success: boolean;
  message?: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
}

export interface AppLogListParams {
  page: number;
  limit: number;
  userId?: string;
  level?: LogLevel;
  ipAddress?: string;
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface TokenLogListParams {
  page: number;
  limit: number;
  userId?: string;
  eventType?: string;
  tokenId?: string;
  success?: boolean;
  ipAddress?: string;
  isDeleted?: boolean;
}


/**
 * Menyimpan log umum aplikasi ke tabel app_logs menggunakan Drizzle ORM.
 * Fungsi ini dilemparkan (throws) error jika penyimpanan ke DB gagal,
 * memungkinkan Log Consumer (RabbitMQ) untuk melakukan NACK.
 * @param data Data log dari event RabbitMQ.
 */
export async function saveAppLog(data: AppLogPayload): Promise<any> {
  try {
    return await db.insert(appLogs).values({
      ...data,
      createdBy: data.userId
    }).returning();
  } catch (error) {
    console.error("Failed to save app log to DB:", error);
    throw error;
  }
}

/**
 * Menyimpan log audit token ke tabel token_logs menggunakan Drizzle ORM.
 * @param data Data log token dari event RabbitMQ.
 */
export async function saveTokenLog(data: TokenLogPayload): Promise<void> {
  try {
    await db.insert(tokenLogs).values({
      ...data,
      createdBy: data.userId
    });
  } catch (error) {
    console.error("Failed to save token log to DB:", error);
    throw error;
  }
}


export async function getAppLogsList({
  page, limit, userId, level, ipAddress, isDeleted = false, endDate, startDate
}: AppLogListParams): Promise<APIPagination<AppLog>> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [
    eq(appLogs.isDeleted, isDeleted),
  ];

  if (userId) {
    whereConditions.push(eq(appLogs.userId, userId));
  }
  if (level) {
    whereConditions.push(eq(appLogs.level, level));
  }
  if (ipAddress) {
    whereConditions.push(sql`${appLogs.ipAddress} ILIKE ${'%' + ipAddress + '%'}`);
  }

  if (startDate && endDate) {
    const tzOffset = 7 * 60 * 60 * 1000; // WIB offset dalam ms

    const start = new Date(new Date(startDate).getTime() - tzOffset);
    const end = new Date(new Date(endDate).getTime() - tzOffset);
    end.setHours(23, 59, 59, 999);

    whereConditions.push(
      sql`${appLogs.createdAt} BETWEEN ${start} AND ${end}`
    );
  }

  const dataPromise = db.query.appLogs.findMany({
    where: and(...whereConditions),
    limit: limit,
    offset: offset,
    orderBy: desc(appLogs.createdAt),
    with: {
      user: {
        columns: {
          email: true,
          id: true,
        },
        with: {
          userDetails: {
            columns: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(appLogs)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data as any[],
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

/**
 * Mendapatkan daftar log token (Token Logs) dengan filter dan pagination.
 * @param params Parameter query untuk filter dan pagination.
 */
export async function getTokenLogsList({
  page, limit, userId, eventType, tokenId, success, ipAddress, isDeleted = false
}: TokenLogListParams): Promise<APIPagination<TokenLog>> {

  const offset = (page - 1) * limit;
  const whereConditions: SQLWrapper[] = [
    eq(tokenLogs.isDeleted, isDeleted),
  ];

  if (userId) {
    whereConditions.push(eq(tokenLogs.userId, userId));
  }
  if (tokenId) {
    whereConditions.push(eq(tokenLogs.tokenId, tokenId));
  }
  if (eventType) {
    whereConditions.push(sql`${tokenLogs.eventType} ILIKE ${'%' + eventType.toLowerCase() + '%'}`);
  }
  if (success !== undefined) {
    whereConditions.push(eq(tokenLogs.success, success));
  }
  if (ipAddress) {
    whereConditions.push(sql`${tokenLogs.ipAddress} ILIKE ${'%' + ipAddress + '%'}`);
  }

  const dataPromise = db.select()
    .from(tokenLogs)
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(tokenLogs.createdAt));

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(tokenLogs)
    .where(and(...whereConditions));

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  return {
    data: data as TokenLog[],
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}