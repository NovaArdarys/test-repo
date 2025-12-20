import { db } from "@/db";
import { dailyReports } from "@/db/schemas";
import { buildUIReport, calculateStatus } from "@/utils/aiPharser";
import { groupStepsBySubDomain } from "@/utils/transformSteps";
import { and, desc, eq, inArray, sql, gte, lte } from "drizzle-orm";

export async function getAllDailyReports({
  page = 1,
  limit = 10,
  kitchenIds = [],
  startDate,
  endDate,
  subDomain,
}: {
  page: number;
  limit: number;
  kitchenIds: string[];
  startDate?: string;
  endDate?: string;
  subDomain?: string;
}) {

  const whereConditions = [
    inArray(dailyReports.entityId, kitchenIds),
    eq(dailyReports.entityType, "kitchen"),
  ];

  if (startDate) whereConditions.push(gte(dailyReports.date, startDate));
  if (endDate) whereConditions.push(lte(dailyReports.date, endDate));

  const [{ count }] = await db
    .select({
      count: sql`COUNT(*)`.mapWith(Number),
    })
    .from(dailyReports)
    .where(and(...whereConditions));

  const rows = await db
    .select({
      id: dailyReports.id,
      date: dailyReports.date,
      menuPlan: sql`
      (
        SELECT json_build_object(
          'id', mp.id,
          'name', mp.name,
          'planStartDate', mp.plan_start_date,
          'planEndDate', mp.plan_end_date,
          'items', (
            SELECT json_agg(
              json_build_object(
                'id', fi.id,
                'name', fi.name,
                'nameEn', fi.name_en,
                'type', fi.type
              )
            )
            FROM menu_food_item mfi
            JOIN food_items fi ON fi.id = mfi.food_item_id
            WHERE mfi.menu_food_plan_id = mp.id
            AND mfi.is_deleted = false
          )
        )
        FROM menu_plans mp
        WHERE mp.id = daily_reports.menu_plan_id
      )
      `.as("menuPlan"),
      steps: sql`
      (
        SELECT json_agg(
          json_build_object(
            'id', sr.id,
            'subDomain', sr.sub_domains,
            'isCompleted', sr.is_completed,
            'notes', sr.notes,
            'stepKey', ms.step_key,
            'stepName', ms.step_name,
            'stepOrder', ms.step_order,
            'imageURL', st.file_url,
            'createdAt', sr.updated_at,
            'storageId', sr.storage_id,
            'storageFileName', st.file_name,
            'storageMimeType', st.mime_type,
            'storageSize', st.size,
            'storageMeta', st.meta,
            'storageCreatedAt', st.created_at,
            'storageCreatedBy', json_build_object(
              'id', u.id,
              'email', u.email,
              'name', trim(concat_ws(' ', ud.first_name, ud.last_name)),
              'phoneNumber', ud.phone_number,
              'imageURL', ud.image_url
            ),
            'ai', (
              SELECT json_agg(
                json_build_object(
                  'type', al.analysis_type,
                  'output', al.output,
                  'thumbnail', al.output_image_url,
                  'storageId', al.storage_id
                )
              )
              FROM ai_analysis_logs al
              WHERE al.entity_id = sr.id
            )
          )
        )
        FROM step_reports sr
        JOIN master_steps ms ON ms.id = sr.step_id
        LEFT JOIN storages st ON st.id = sr.storage_id
        LEFT JOIN users u ON u.id = st.created_by
        LEFT JOIN user_details ud ON ud.user_id = u.id
        WHERE sr.daily_report_id = daily_reports.id
        ${subDomain ? sql`AND sr.sub_domains = ${subDomain}` : sql``}
      )
    `.as("steps"),
    })
    .from(dailyReports)
    .where(and(...whereConditions))
    .orderBy(desc(dailyReports.date))
    .limit(limit)
    .offset((page - 1) * limit);


  const data = rows.map((row) => {
    const steps = buildUIReport(
      row.steps as [] ?? [],
      (row?.menuPlan as any)?.items as [] ?? []
    );

    return {
      id: row.id,
      date: row.date,
      menuPlan: row.menuPlan,
      status: calculateStatus(steps),
      steps,
    };
  });


  return {
    data,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}
