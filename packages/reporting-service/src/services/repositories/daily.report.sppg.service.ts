import { db } from "@/db";
import { sql } from "drizzle-orm";

type GetDailyReportsSummaryParams = {
  startDate?: string;
  endDate?: string;
  kitchenIds?: string[];
};

export async function getDailyReportsSummary(params?: GetDailyReportsSummaryParams) {
  const today = new Date().toISOString().slice(0, 10);

  const {
    startDate = today,
    endDate = today,
    kitchenIds = [],
  } = params ?? {};

  const dailyReportsByDate = await db.execute(sql`
    SELECT
      dr.date::text AS date,
      COUNT(DISTINCT dr.id) AS total_reports
    FROM daily_reports dr
    WHERE dr.entity_type = 'kitchen'
      AND dr.date >= ${startDate}
      AND dr.date <= ${endDate}
      ${kitchenIds.length > 0
      ? sql`AND dr.entity_id = ANY(${sql.raw(
        `ARRAY[${kitchenIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
      )})`
      : sql``}
    GROUP BY dr.date
    ORDER BY dr.date ASC
  `);

  const graphDailyReport = (dailyReportsByDate.rows ?? []).map((row: any) => ({
    date: row.date as string,
    totalReport: Number(row.total_reports ?? 0),
  }));

  const totalDailyReport = graphDailyReport.reduce(
    (acc, item) => acc + item.totalReport,
    0
  );


  const deliveriesByDate = await db.execute(sql`
    SELECT
      d.delivery_date::text AS date,
      COALESCE(SUM(d.target_portion), 0)      AS target_portion,
      COALESCE(SUM(d.received_portion), 0)    AS received_portion,
      COALESCE(SUM(d.taken_tray), 0)          AS taken_tray
    FROM deliveries d
    WHERE d.is_deleted = false
      AND d.delivery_date >= ${startDate}
      AND d.delivery_date <= ${endDate}
      ${kitchenIds.length > 0
      ? sql`AND d.kitchen_id = ANY(${sql.raw(
        `ARRAY[${kitchenIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
      )})`
      : sql``}
    GROUP BY d.delivery_date
    ORDER BY d.delivery_date ASC
  `);

  const graphTotalPortion = (deliveriesByDate.rows ?? []).map((row: any) => ({
    date: row.date as string,
    targetPortion: Number(row.target_portion ?? 0),
    receivedPortion: Number(row.received_portion ?? 0),
    takenTray: Number(row.taken_tray ?? 0),
  }));

  const totalDeliveryPortion = graphTotalPortion.reduce(
    (acc, item) => acc + item.receivedPortion,
    0
  );

  return {
    data: {
      totalDailyReport,
      totalDeliveryPortion,
      graphDailyReport,
      graphTotalPortion,
    },
  };
}
