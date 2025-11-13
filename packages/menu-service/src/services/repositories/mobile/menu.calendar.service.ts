import { db } from "@/db";
import { menuPlans } from "@/db/schemas";
import { buildPaginatedWhere } from "@/utils/pagination";
import { isEmpty } from "lodash";
import { sql } from "drizzle-orm";
import { parseISO, isWeekend } from "date-fns"; // 🧠 <== Tambahkan ini

export async function getMenuPlansCalendar({
  page,
  limit,
  startDate,
  endDate,
  kitchenIds = [],
  schoolIds = [],
  driversIds = [],
  entityType = "kitchen",
}: {
  page: number;
  limit: number;
  startDate?: string | null;
  endDate?: string | null;
  kitchenIds?: string[];
  schoolIds?: string[];
  driversIds?: string[];
  entityType?: string;
}) {
  const { where, meta } = await buildPaginatedWhere({
    table: menuPlans,
    tableName: "menu_plans",
    base: {
      isDeleted: false,
      planStartDate: { gte: startDate ?? undefined },
      planEndDate: { lte: endDate ?? undefined },
    },
    extra: [
      entityType === "kitchen" && !isEmpty(kitchenIds)
        ? sql`${menuPlans.kitchenId} = ANY(ARRAY[${sql.raw(
          kitchenIds.map((id) => `'${id}'`).join(",")
        )}]::uuid[])`
        : undefined,

      entityType === "driver" && !isEmpty(driversIds)
        ? sql`${menuPlans.kitchenId} IN (
            SELECT uk.kitchen_id
            FROM user_kitchens uk
            WHERE uk.user_id = ANY(ARRAY[${sql.raw(
          driversIds.map((id) => `'${id}'`).join(",")
        )}]::uuid[])
              AND uk.is_deleted = false
          )`
        : undefined,

      (entityType === "school" || entityType === "beneficiary") && !isEmpty(schoolIds)
        ? sql`${menuPlans.id} IN (
            SELECT mps.menu_plan_id
            FROM menu_plan_beneficiaries mps
            WHERE mps.beneficiary_id = ANY(ARRAY[${sql.raw(
          schoolIds.map((id) => `'${id}'`).join(",")
        )}]::uuid[])
              AND mps.is_deleted = false
          )`
        : undefined,
    ],
    page,
    limit,
  });

  const data = await db.query.menuPlans.findMany({
    where: () => where,
    columns: {
      id: true,
      name: true,
      planStartDate: true,
      updatedAt: true,
    },
    orderBy: (table) => sql`${table.planStartDate} ASC`,
    offset: (page - 1) * limit,
    limit,
  });

  const formatted = data.map((mp) => {
    const parsedDate = mp.planStartDate
      ? parseISO(mp.planStartDate.toString())
      : null;
    const weekendFlag = parsedDate ? isWeekend(parsedDate) : false;

    return {
      id: mp.id,
      name: mp.name,
      date: mp.planStartDate,
      updatedAt: mp.updatedAt,
      isWeekend: weekendFlag,
    };
  });

  return {
    data: formatted,
    meta,
  };
}
