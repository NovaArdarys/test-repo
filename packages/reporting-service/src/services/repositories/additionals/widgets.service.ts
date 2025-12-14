import { sql } from "drizzle-orm";
import { addDays } from "date-fns";
import { db } from "@/db";

export async function getHomeWidgets(params: {
  view?: "home" | "calendar" | "delivery" | "report" | "profile";
  entityType?: string;
  endDate: string;
  kitchenIds: string[];
  schoolIds: string[];
  driversIds: string[];
  subDomains: string[];
}) {
  const {
    view,
    entityType,
    endDate,
    kitchenIds,
    schoolIds,
    driversIds,
    subDomains,
  } = params;

  console.log(kitchenIds, "=====kitchenIds====");

  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const tomorrow = toISO(addDays(new Date(endDate), 1));
  const threeDaysAfterTomorrow = toISO(addDays(new Date(endDate), 3));

  const uuidArray = (ids: string[]) =>
    sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(",")}]::uuid[]`);

  const filterSubDomain =
    subDomains.length > 0
      ? sql`sr.sub_domains = ANY(${sql.raw(
        `ARRAY[${subDomains.map((d) => `'${d}'`).join(",")}]::text[]`
      )})`
      : sql`sr.sub_domains IS NULL`;

  if (view === "home") {
    const [row] = await db
      .select({
        threeDaysMenu: sql`
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
              ${entityType === "driver" && driversIds.length > 0
            ? sql`AND mp.kitchen_id IN (
                    SELECT uk.kitchen_id
                    FROM user_kitchens uk
                    WHERE uk.user_id = ANY(${uuidArray(driversIds)})
                      AND uk.is_deleted = false
                  )`
            : sql``}
              ${entityType === "kitchen" && kitchenIds.length > 0
            ? sql`AND mp.kitchen_id = ANY(${uuidArray(kitchenIds)})`
            : sql``}
              ${(entityType === "school" || entityType === "beneficiary") &&
            schoolIds.length > 0
            ? sql`AND mp.id IN (
                    SELECT mps.menu_plan_id
                    FROM menu_plan_beneficiaries mps
                    WHERE mps.beneficiary_id = ANY(${uuidArray(schoolIds)})
                      AND mps.is_deleted = false
                  )`
            : sql``}
              AND mp.plan_start_date >= ${tomorrow}
              AND mp.plan_start_date <= ${threeDaysAfterTomorrow}
            ORDER BY mp.plan_start_date ASC
          ) t
        ), '[]'::jsonb)
      `,

        eventReports: sql`
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'reportType', t.report_type,
                'date', t.date,
                'location', t.location,
                'description', t.description
              )
            )
            FROM (
              SELECT er.*
              FROM event_reports er
              WHERE er.is_deleted = false
                ${entityType === "driver" && driversIds.length > 0
            ? sql`
                        AND er.entity_type = 'driver'
                        AND er.entity_id = ANY(${uuidArray(driversIds)})
                      `
            : sql``
          }
                ${entityType === "kitchen" && kitchenIds.length > 0
            ? sql`
                        AND er.entity_type = 'kitchen'
                        AND er.entity_id = ANY(${uuidArray(kitchenIds)})
                      `
            : sql``
          }
                ${(entityType === "school" || entityType === "beneficiary") &&
            schoolIds.length > 0
            ? sql`
                        AND er.entity_type = ${entityType}
                        AND er.entity_id = ANY(${uuidArray(schoolIds)})
                      `
            : sql``
          }
              ORDER BY er.created_at DESC
              LIMIT 3
            ) t
          ), '[]'::jsonb)
        `,

        topSuppliers: sql`
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'phoneNumber', t.phone_number,
              'imageURL', t.image_url,
              'foodItems', (
                SELECT COALESCE(jsonb_agg(
                  jsonb_build_object(
                    'id', fi.id,
                    'name', fi.name,
                    'type', fi.type
                  )
                ), '[]'::jsonb)
                FROM suppliers_products sp
                JOIN food_items fi ON fi.id = sp.food_item_id
                WHERE sp.supplier_id = t.id
                  AND sp.is_deleted = false
                  AND fi.is_deleted = false
              )
            )
          )
          FROM (
            SELECT s.id, s.name, s.phone_number, s.image_url
            FROM suppliers s
            WHERE s.is_deleted = false
            AND s.kitchen_id = ANY(${uuidArray(kitchenIds)})
            ORDER BY s.created_at DESC
            LIMIT 3
          ) t
        ), '[]'::jsonb)
      `,

        stepTomorrow: sql`
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
          FROM step_reports sr
          JOIN master_steps ms ON ms.id = sr.step_id
          JOIN daily_reports dr ON dr.id = sr.daily_report_id
          WHERE dr.date = ${tomorrow}
            AND ${filterSubDomain}
            AND dr.entity_id = ANY(${uuidArray(kitchenIds)})
        ), '[]'::jsonb)
      `,
      })
      .from(sql`(SELECT 1) _`);

    return {
      threeDaysMenu: row?.threeDaysMenu ?? [],
      eventReports: row?.eventReports ?? [],
      topSuppliers: row?.topSuppliers ?? [],
      stepTomorrow: row?.stepTomorrow ?? [],
    };
  }

  const [row] = await db
    .select({
      beneficiaries: sql`
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'address', b.address,
            'phoneNumber', b.phone_number,
            'category', b.category,
            'imageURL', b.image_url,
            'smallPortion', b.small_portion,
            'largePortion', b.large_portion
          )
        )
        FROM beneficiaries b
        WHERE b.is_deleted = false
      ), '[]'::jsonb)
    `,
      stepTomorrow: sql`
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
        FROM step_reports sr
        JOIN master_steps ms ON ms.id = sr.step_id
        JOIN daily_reports dr ON dr.id = sr.daily_report_id
        WHERE dr.date = ${tomorrow}
          AND ${filterSubDomain}
      ), '[]'::jsonb)
    `,
    })
    .from(sql`(SELECT 1) _`);

  return {
    beneficiaries: row?.beneficiaries ?? [],
    stepTomorrow: row?.stepTomorrow ?? [],
  };

}
