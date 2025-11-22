import { db } from "@/db";
import {
  dailyReports,
  foodItems,
  masterSteps,
  menuPlans,
  stepReports,
  storage,
  suppliers,
  suppliersFoodItems,
} from "@/db/schemas";
import { buildPaginatedWhere } from "@/utils/pagination";
import { addDays } from "date-fns";
import { eq, desc, sql } from "drizzle-orm";
import { orderBy } from "lodash";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { getReportTypeDate } from "@/utils/ReportType";
import { getBeneficiariesAndDriversByKitchenIds } from "./daily.reference.ids.service";

export type DailyReport = InferSelectModel<typeof dailyReports>;
export type DailyReportInsert = InferInsertModel<typeof dailyReports>;
export type StepReport = InferSelectModel<typeof stepReports>;
export type StepReportInsert = InferInsertModel<typeof stepReports>;

export async function getDailyReportsListSPPG(params?: {
  entityType?: string;
  entityId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  kitchenIds?: string[];
  schoolIds?: string[];
  driversIds?: string[];
  page: number;
  limit: number;
  menuPlanName?: string;
  view?: "home" | "calendar" | "delivery" | "report" | "profile";
  typeOfReport?: "" | "7d" | "1m" | "3m" | "6m";
}) {
  const today = new Date().toISOString().slice(0, 10);
  const {
    entityType,
    entityId,
    status,
    startDate = today,
    endDate = today,
    kitchenIds = [],
    page = 1,
    limit = 10,
    view,
    typeOfReport
  } = params ?? {};
  const graphReportStartDate = getReportTypeDate(startDate, typeOfReport);
  const { beneficiaries: schoolIds, drivers: driversIds } = await getBeneficiariesAndDriversByKitchenIds(kitchenIds);
  const ORentityIds = [
    ...kitchenIds,
    ...driversIds,
    ...schoolIds
  ].filter(Boolean);

  const entityIdsForEvents = [
    ...kitchenIds,
  ].filter(Boolean);

  let computedEndDate = endDate;
  if (view === "home" && endDate) {
    try {
      computedEndDate = addDays(new Date(endDate), 3)
        .toISOString()
        .split("T")[0];
    } catch {
      computedEndDate = endDate;
    }
  }

  const { where, meta } = await buildPaginatedWhere({
    table: dailyReports,
    tableName: "daily_reports",
    base: {
      entityType,
      entityId,
      status,
      date: { gte: startDate ?? undefined, lte: endDate ?? undefined },
    },
    extra: [
      ORentityIds.length > 0
        ? sql`${dailyReports.entityId} = ANY(${sql.raw(
          `ARRAY[${ORentityIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
        )})`
        : undefined,
      params?.menuPlanName
        ? sql`${dailyReports.menuPlanId} IN (
            SELECT id FROM menu_plans WHERE name ILIKE ${`%${params?.menuPlanName}%`}
          )`
        : undefined,
    ],
    page,
    limit,
  });

  let graphEventReport: any[] = [];
  let graphTotalPortion: any[] = [];
  let totalEventReport = 0;
  let totalDeliveryPortion = 0;
  let threeDaysMenuHome: any[] = [];
  let eventReportsHome: any[] = [];

  const threeDaysMenuField =
    view === "home"
      ? sql`
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'date', t.plan_start_date
            )
          )
          FROM (
            SELECT mp.id, mp.name, mp.plan_start_date
            FROM menu_plans mp
            WHERE mp.is_deleted = false
              ${entityType === "kitchen" && kitchenIds.length > 0
          ? sql`AND mp.kitchen_id = ANY(${sql.raw(
            `ARRAY[${kitchenIds
              .map((id) => `'${id}'`)
              .join(",")}]::uuid[]`
          )})`
          : sql``
        }
              AND mp.plan_start_date >= ${endDate}
              AND mp.plan_start_date <= ${computedEndDate}
            ORDER BY mp.plan_start_date ASC
          ) t
        ), '[]'::jsonb)
      `
      : sql`'[]'::jsonb`;

  const schoolListField = sql`
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'address', s.address,
          'phoneNumber', s.phone_number,
          'category', s.category,
          'imageURL', s.image_url,
          'smallPortion', s.small_portion,
          'largePortion', s.large_portion
        )
      )
      FROM (
        SELECT DISTINCT b.id, b.name, b.address, b.phone_number, b.category, b.image_url, b.small_portion, b.large_portion
        FROM beneficiaries b
        INNER JOIN menu_plan_beneficiaries mpb ON mpb.beneficiary_id = b.id
        INNER JOIN menu_plans mp ON mp.id = mpb.menu_plan_id
        WHERE b.is_deleted = false
          AND mp.is_deleted = false
          ${entityType === "kitchen" && kitchenIds.length > 0
      ? sql`AND mp.kitchen_id = ANY(${sql.raw(
        `ARRAY[${kitchenIds
          .map((id) => `'${id}'`)
          .join(",")}]::uuid[]`
      )})`
      : sql``
    }
          AND mp.plan_start_date >= ${endDate}
          AND mp.plan_start_date <= ${computedEndDate}
        ORDER BY b.name ASC
      ) s
    ), '[]'::jsonb)
  `;

  const eventReportsField =
    view === "home"
      ? sql`
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', inner_er.id,
            'name', inner_er.name,
            'reportType', inner_er.report_type,
            'date', inner_er.date,
            'location', inner_er.location,
            'description', inner_er.description
          )
        )
        FROM (
          SELECT er.*
          FROM event_reports er
          WHERE er.is_deleted = false
          ${entityIdsForEvents.length > 0
          ? sql`AND er.entity_id = ANY(${sql.raw(
            `ARRAY[${entityIdsForEvents.map(id => `'${id}'`).join(",")}]::uuid[]`
          )})`
          : sql``}
            AND er.date::date >= ${endDate}
            AND er.date::date <= ${computedEndDate}
          ORDER BY er.date DESC
          LIMIT 3
        ) inner_er
      ), '[]'::jsonb)
    `
      : sql`'[]'::jsonb`;

  const stepTomorrowField =
    view === "home" &&
      entityType === "kitchen" &&
      kitchenIds.length > 0 &&
      endDate
      ? sql`
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', sr.id,
              'stepKey', ms.step_key,
              'stepName', ms.step_name,
              'stepOrder', ms.step_order,
              'isCompleted', sr.is_completed,
              'notes', sr.notes
            )
          )
          FROM (
            SELECT sr.*
            FROM step_reports sr
            INNER JOIN daily_reports dr ON dr.id = sr.daily_report_id
            INNER JOIN menu_plans mp ON mp.id = dr.menu_plan_id
            WHERE dr.entity_id = ANY(${sql.raw(
        `ARRAY[${kitchenIds
          .map((id) => `'${id}'`)
          .join(",")}]::uuid[]`
      )})
              AND dr.entity_type = 'kitchen'
              AND dr.date = ${addDays(new Date(endDate), 1)
          .toISOString()
          .split("T")[0]}
          ) sr
          INNER JOIN master_steps ms ON ms.id = sr.step_id
        ), '[]'::jsonb)
      `
      : sql`'[]'::jsonb`;

  if (view === "home") {
    const [eventReportsByDate, deliveriesByDate, threeDaysMenuData, eventReportsData] =
      await Promise.all([
        db.execute(sql`
          SELECT dr.date::text AS date, COUNT(DISTINCT dr.id) AS total_reports
          FROM event_reports dr
          WHERE dr.date >= ${graphReportStartDate}
            AND dr.date <= ${today}
            ${entityIdsForEvents.length > 0
            ? sql`AND dr.entity_id = ANY(${sql.raw(
              `ARRAY[${entityIdsForEvents.map(id => `'${id}'`).join(",")}]::uuid[]`
            )})`
            : sql``}
          GROUP BY dr.date
          ORDER BY dr.date ASC
        `),
        db.execute(sql`
          SELECT d.delivery_date::text AS date,
            COALESCE(SUM(d.target_portion), 0) AS target_portion,
            COALESCE(SUM(d.received_portion), 0) AS received_portion,
            COALESCE(SUM(d.taken_tray), 0) AS taken_tray
          FROM deliveries d
          WHERE d.is_deleted = false
            AND d.delivery_date >= ${graphReportStartDate}
            AND d.delivery_date <= ${today}
            ${kitchenIds.length > 0
            ? sql`AND d.kitchen_id = ANY(${sql.raw(
              `ARRAY[${kitchenIds
                .map((id) => `'${id}'`)
                .join(",")}]::uuid[]`
            )})`
            : sql``
          }
          GROUP BY d.delivery_date
          ORDER BY d.delivery_date ASC
        `),
        db.execute(sql`SELECT (${threeDaysMenuField}) AS "threeDaysMenu"`),
        db.execute(sql`SELECT (${eventReportsField}) AS "eventReports"`),
      ]);

    graphEventReport = (eventReportsByDate.rows ?? []).map((r: any) => ({
      date: r.date,
      totalReport: Number(r.total_reports ?? 0),
    }));

    totalEventReport = graphEventReport.reduce(
      (acc, i) => acc + i.totalReport,
      0
    );

    graphTotalPortion = (deliveriesByDate.rows ?? []).map((r: any) => ({
      date: r.date,
      targetPortion: Number(r.target_portion ?? 0),
      receivedPortion: Number(r.received_portion ?? 0),
      takenTray: Number(r.taken_tray ?? 0),
    }));

    totalDeliveryPortion = graphTotalPortion.reduce(
      (acc, i) => acc + i.receivedPortion,
      0
    );

    threeDaysMenuHome =
      (threeDaysMenuData?.rows?.[0]?.threeDaysMenu as any[]) ?? [];
    eventReportsHome =
      (eventReportsData?.rows?.[0]?.eventReports as any[]) ?? [];
  }

  let widgets: any = {};
  if (view !== "home") {
    const [
      beneficiariesData,
      stepTomorrowData,
      eventReportsData,
      threeDaysMenuData,
    ] = await Promise.all([
      db.execute(sql`SELECT (${schoolListField}) AS "beneficiaries"`),
      db.execute(sql`SELECT (${stepTomorrowField}) AS "stepTomorrow"`),
      view === "calendar"
        ? null
        : db.execute(sql`SELECT (${eventReportsField}) AS "eventReports"`),
      view === "calendar"
        ? null
        : db.execute(sql`SELECT (${threeDaysMenuField}) AS "threeDaysMenu"`),
    ]);

    widgets = {
      beneficiaries: beneficiariesData?.rows?.[0]?.beneficiaries ?? [],
      stepTomorrow: stepTomorrowData?.rows?.[0]?.stepTomorrow ?? [],
      ...(view !== "calendar"
        ? {
          eventReports: eventReportsData?.rows?.[0]?.eventReports ?? [],
          threeDaysMenu: threeDaysMenuData?.rows?.[0]?.threeDaysMenu ?? [],
        }
        : {}),
    };
  }

  const data = await db
    .select({
      dailyReports,
      menuPlan: {
        id: menuPlans.id,
        name: menuPlans.name,
        planEndDate: menuPlans.planEndDate,
        planStartDate: menuPlans.planStartDate,
        beneficiaries: sql`null`.as("beneficiaries"),
        targetPortion: sql`
          (
            SELECT json_build_object(
              'small', COALESCE(SUM(b.small_portion), 0),
              'large', COALESCE(SUM(b.large_portion), 0),
              'total', COALESCE(SUM(b.small_portion + b.large_portion), 0)
            )
            FROM menu_plan_beneficiaries mpb
            JOIN beneficiaries b ON b.id = mpb.beneficiary_id
            WHERE mpb.menu_plan_id = ${menuPlans.id}
              AND mpb.is_deleted = false
              AND b.is_deleted = false
          )
        `.as("targetPortion"),
      },
      suppliersFoodItem: { id: suppliersFoodItems.id },
      foodItem: {
        id: foodItems.id,
        description: foodItems.description,
        name: foodItems.name,
        type: foodItems.type,
      },
      supplier: {
        id: suppliers.id,
        address: suppliers.address,
        name: suppliers.name,
        description: suppliers.description,
        phoneNumber: suppliers.phoneNumber,
      },
      steps: sql`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sr.id,
                'isCompleted', sr.is_completed,
                'notes', sr.notes,
                'stepKey', ms.step_key,
                'stepName', ms.step_name,
                'stepOrder', ms.step_order,
                'imageURL', st.file_url,
                'createdAt', sr.updated_at
              )
              ORDER BY ms.step_order
            )
            FROM step_reports sr
            JOIN master_steps ms ON ms.id = sr.step_id
            LEFT JOIN storages st ON st.id = sr.storage_id
            WHERE sr.daily_report_id = ${dailyReports.id}
          ),
          '[]'::json
        )
      `.as("steps"),
    })
    .from(dailyReports)
    .leftJoin(menuPlans, eq(dailyReports.menuPlanId, menuPlans.id))
    .leftJoin(
      suppliersFoodItems,
      eq(menuPlans.id, suppliersFoodItems.menuPlanId)
    )
    .leftJoin(foodItems, eq(suppliersFoodItems.foodItemId, foodItems.id))
    .leftJoin(suppliers, eq(suppliersFoodItems.supplierId, suppliers.id))
    .leftJoin(stepReports, eq(dailyReports.id, stepReports.dailyReportId))
    .leftJoin(masterSteps, eq(stepReports.stepId, masterSteps.id))
    .leftJoin(storage, eq(stepReports.id, storage.entityId))
    .where(where)
    .groupBy(
      dailyReports.id,
      menuPlans.id,
      suppliersFoodItems.id,
      foodItems.id,
      suppliers.id
    )
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(desc(dailyReports.date));

  const reportMap = new Map<string, any>();

  data.forEach((row) => {
    const reportId = row.dailyReports.id as string;

    if (!reportMap.has(reportId)) {
      reportMap.set(reportId, {
        ...row.dailyReports,
        menuPlan: row.menuPlan
          ? { ...row.menuPlan, _foodItemMap: new Map() }
          : null,
        steps: row.steps,
      });
    }

    const report = reportMap.get(reportId);
    const sfiId = row.suppliersFoodItem?.id as string | undefined;
    const foodItemId = row.foodItem?.id as string | undefined;

    if (sfiId && report.menuPlan) {
      let foodRow = report.menuPlan._foodItemMap.get(sfiId);
      if (!foodRow) {
        foodRow = {
          ...(row.foodItem ?? {}),
          id: sfiId,
          foodId: foodItemId,
          suppliers: [],
        };
        report.menuPlan._foodItemMap.set(sfiId, foodRow);
      }

      if (
        row.supplier &&
        !foodRow.suppliers.some((s: any) => s.id === row.supplier?.id)
      ) {
        foodRow.suppliers.push(row.supplier);
      }
    }
  });

  const finalGroupedData = Array.from(reportMap.values()).map((report) => {
    if (report.menuPlan) {
      report.menuPlan.foodItems = Array.from(
        report.menuPlan._foodItemMap.values()
      );
      delete report.menuPlan._foodItemMap;

      const { planEndDate, planStartDate, ...rest } = report.menuPlan;
      report.menuPlan = { date: planStartDate, ...rest };
    }

    report.steps = orderBy(report.steps, "stepOrder", "asc");

    const {
      entityId,
      menuPlanId,
      createdAt,
      createdBy,
      updatedAt,
      updatedBy,
      date,
      entityType,
      status,
      ...finalReport
    } = report;

    return finalReport;
  });

  return {
    data: {
      agenda: finalGroupedData,
      ...(view === "home"
        ? {
          graphEventReport,
          graphTotalPortion,
          totalEventReport,
          totalDeliveryPortion,
          threeDaysMenu: threeDaysMenuHome,
          eventReports: eventReportsHome,
        }
        : { widgets }),
    },
    meta,
  };
}
