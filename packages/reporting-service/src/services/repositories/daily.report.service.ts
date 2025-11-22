import { db } from "@/db";
import { dailyReports, foodItems, masterSteps, menuPlans, menuPlanBeneficiaries, stepReports, storage, suppliers, suppliersFoodItems } from "@/db/schemas";
import { kitchens, drivers, beneficiaries } from "@/db/schemas";
import { buildPaginatedWhere } from "@/utils/pagination";
import { addDays } from "date-fns";
import { eq, and, desc, InferInsertModel, InferSelectModel, between, gte, lte, sql, inArray, SQLWrapper } from "drizzle-orm";
import { isEmpty, orderBy } from "lodash";

export type DailyReport = InferSelectModel<typeof dailyReports>;
export type DailyReportInsert = InferInsertModel<typeof dailyReports>;
export type StepReport = InferSelectModel<typeof stepReports>;
export type StepReportInsert = InferInsertModel<typeof stepReports>;

async function validateEntity(entityType: string, entityId: string) {
  switch (entityType) {
    case "kitchen":
      return db.query.kitchens.findFirst({ where: eq(kitchens.id, entityId) });
    case "driver":
      return db.query.drivers.findFirst({ where: eq(drivers.id, entityId) });
    case "school":
      return db.query.beneficiaries.findFirst({ where: eq(beneficiaries.id, entityId) });
    case "beneficiary":
      return db.query.beneficiaries.findFirst({ where: eq(beneficiaries.id, entityId) });
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

async function planEntity(entityType: string) {
  return db.query.masterSteps.findMany({ where: eq(masterSteps.entityType, entityType as any) });
}

async function getMenuPlanDate(
  date: string,
  entityType: "school" | "kitchen" | "beneficiary",
  entityId: string
) {
  const menuPlanByEntity = await db.query.menuPlanBeneficiaries.findFirst({
    where:
      (entityType === "school" || entityType === "beneficiary")
        ? eq(menuPlanBeneficiaries.beneficiaryId, entityId)
        : undefined,
  });

  if (!menuPlanByEntity) return null;

  const menuPlan = await db.query.menuPlans.findFirst({
    where: and(
      eq(menuPlans.id, menuPlanByEntity.menuPlanId),
      eq(menuPlans.kitchenId, entityId),
      gte(menuPlans.planStartDate, sql`${date}`),
      lte(menuPlans.planEndDate, sql`${date}`)
    ),
  });

  return menuPlan;
}

export async function createDailyReport(data: DailyReportInsert) {
  return await db.transaction(async (tx) => {
    const entity = await validateEntity(data.entityType, data.entityId);
    if (!entity) throw new Error(`${data.entityType} not found`);

    const [inserted] = await tx.insert(dailyReports).values(data).returning();

    const planEntityData = await planEntity(data.entityType);

    for (const { id } of planEntityData) {
      await tx.insert(stepReports).values({
        createdBy: inserted.createdBy,
        dailyReportId: inserted.id,
        stepId: id,
        isCompleted: false,
      });
    }

    return inserted;

  });
}

export async function getDailyReportById(id: string) {
  const data = await db.query.dailyReports.findFirst({
    where: eq(dailyReports.id, id),
    with: {
      menuPlan: {
        columns: {
          id: true,
          name: true,
          planEndDate: true,
          planStartDate: true,
        },
        with: {
          menuPlanBeneficiaries: {
            with: {
              beneficiary: {
                columns: {
                  name: true,
                  smallPortion: true,
                  largePortion: true
                }
              }
            }
          },
          suppliersFoodItems: {
            with: {
              foodItem: {
                columns: {
                  id: true,
                  description: true,
                  name: true,
                  type: true,
                },
              },
              supplier: {
                columns: {
                  id: true,
                  address: true,
                  name: true,
                  description: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      steps: {
        columns: {
          id: true,
          isCompleted: true,
          notes: true,
          imageURL: true,
        },
        with: {
          step: {
            columns: {
              stepKey: true,
              stepName: true,
              stepOrder: true,
            },
          },
        },
      },
    }
  });

  const report = data;

  console.log(report?.steps, "=====report=====");

  if (!report?.menuPlan) return report;

  const foodItemMap = new Map<string, any>();
  report.menuPlan.suppliersFoodItems.forEach((sfi) => {
    const foodItem = { ...sfi.foodItem, id: sfi.id, foodId: sfi.foodItem.id };
    const supplier = sfi.supplier;
    if (!foodItem) return;

    const fi = foodItemMap.get(foodItem.id) ?? {
      ...foodItem,
      suppliers: [],
    };
    if (supplier) fi.suppliers.push(supplier);
    foodItemMap.set(foodItem.id, fi);
  });

  const groupedFoodItems = Array.from(foodItemMap.values());
  const { suppliersFoodItems, planEndDate, planStartDate, ...menuPlan } = report.menuPlan;

  return {
    menuPlan: {
      ...menuPlan,
      date: planStartDate,
      foodItems: groupedFoodItems,
    },
    steps: report.steps.map(({ step, ...steps }) => ({
      ...steps,
      ...step,
    })),
  };
}
export async function getDailyReportWithoutMaskById(id: string) {
  const data = await db.query.dailyReports.findFirst({
    where: eq(dailyReports.id, id),
    columns: {
      entityId: true,
      entityType: true
    },
    with: {
      menuPlan: {
        columns: {
          id: true,
          name: true,
          planEndDate: true,
          planStartDate: true,
        },
        with: {
          suppliersFoodItems: {
            with: {
              foodItem: {
                columns: {
                  id: true,
                  description: true,
                  name: true,
                  type: true,
                },
              },
              supplier: {
                columns: {
                  id: true,
                  address: true,
                  name: true,
                  description: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      steps: {
        columns: {
          id: true,
          isCompleted: true,
          notes: true,
          imageURL: true,
        },
        with: {
          step: {
            columns: {
              stepKey: true,
              stepName: true,
              stepOrder: true,
            },
          },
        },
      },
    }
  });

  const report = data;

  if (!report?.menuPlan) return report;

  const foodItemMap = new Map<string, any>();
  report.menuPlan.suppliersFoodItems.forEach((sfi) => {
    const foodItem = { ...sfi.foodItem, id: sfi.id, foodId: sfi.foodItem.id };
    const supplier = sfi.supplier;
    if (!foodItem) return;

    const fi = foodItemMap.get(foodItem.id) ?? {
      ...foodItem,
      suppliers: [],
    };
    if (supplier) fi.suppliers.push(supplier);
    foodItemMap.set(foodItem.id, fi);
  });

  const groupedFoodItems = Array.from(foodItemMap.values());
  const { suppliersFoodItems, planEndDate, planStartDate, ...menuPlan } = report.menuPlan;

  return {
    ...report,
    menuPlan: {
      ...menuPlan,
      date: planStartDate,
      foodItems: groupedFoodItems,
    },
    steps: report.steps.map(({ step, ...steps }) => ({
      ...steps,
      ...step,
    })),
  };
}

export async function getDailyReportsList(params?: {
  entityType?: string;
  entityId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  kitchenIds?: string[];
  schoolIds?: string[];
  driversIds?: string[];
  page: number; // default 1
  limit: number; // default 10
  menuPlanName?: string;
  view?: "home" | "calendar" | "delivery" | "report" | "profile";
}) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const {
    entityType,
    entityId,
    status,

    startDate = today,
    endDate = today,

    kitchenIds = [],
    schoolIds = [],
    driversIds = [],
    page = 1,
    limit = 10,
    view
  } = params ?? {};
  let computedEndDate = endDate;
  if (view === "home" && endDate) {
    try {
      computedEndDate = addDays(new Date(endDate), 3).toISOString().split("T")[0];
    } catch {
      computedEndDate = endDate;
    }
  }

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
            ${entityType === "driver" && driversIds.length > 0
          ? sql`AND mp.kitchen_id IN (
                         SELECT uk.kitchen_id
                         FROM user_kitchens uk
                         WHERE uk.user_id = ANY(${sql.raw(`ARRAY[${driversIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})
                           AND uk.is_deleted = false
                       )`
          : sql``
        }
            ${entityType === "kitchen" && kitchenIds.length > 0
          ? sql`AND mp.kitchen_id = ANY(${sql.raw(`ARRAY[${kitchenIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``
        }
            ${(entityType === "school" || entityType === "beneficiary") && schoolIds.length > 0
          ? sql`AND mp.id IN (
                         SELECT mps.menu_plan_id
                         FROM menu_plan_beneficiaries mps
                         WHERE mps.beneficiary_id = ANY(${sql.raw(`ARRAY[${schoolIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})
                           AND mps.is_deleted = false
                       )`
          : sql``
        }
            AND mp.plan_start_date >= ${endDate}
            AND mp.plan_start_date <= ${computedEndDate}
          ORDER BY mp.plan_start_date ASC
        ) t
      ), '[]'::jsonb)
    `
      : sql`'[]'::jsonb`;


  const schoolListField =
    sql`
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
            ${entityType === "driver" && driversIds.length > 0
        ? sql`AND mp.kitchen_id IN (
                      SELECT uk.kitchen_id
                      FROM user_kitchens uk
                      WHERE uk.user_id = ANY(${sql.raw(`ARRAY[${driversIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})
                        AND uk.is_deleted = false
                    )`
        : sql``
      }
            ${entityType === "kitchen" && kitchenIds.length > 0
        ? sql`AND mp.kitchen_id = ANY(${sql.raw(`ARRAY[${kitchenIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
        : sql``
      }
            ${(entityType === "school" || entityType === "beneficiary") && schoolIds.length > 0
        ? sql`AND b.id = ANY(${sql.raw(`ARRAY[${schoolIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
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
          ${entityType === "driver" && driversIds.length > 0
          ? sql`AND er.entity_id = ANY(${sql.raw(`ARRAY[${driversIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
          ${entityType === "kitchen" && kitchenIds.length > 0
          ? sql`AND er.entity_id = ANY(${sql.raw(`ARRAY[${kitchenIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
          ${(entityType === "school" || entityType === "beneficiary") && schoolIds.length > 0
          ? sql`AND er.entity_id = ANY(${sql.raw(`ARRAY[${schoolIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
          AND er.date::date >= ${endDate}
          AND er.date::date <= ${computedEndDate}
        ORDER BY er.date DESC
        LIMIT 3
      ) inner_er
    ), '[]'::jsonb)
  `
      : sql`'[]'::jsonb`;

  const topSuppliersField =
    view === "home"
      ? sql`
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'phoneNumber', s.phone_number,
            'imageURL', s.image_url,
            'foodItems', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', fi.id,
                  'name', fi.name,
                  'type', fi.type
                )
              )
              FROM suppliers_products sp
              INNER JOIN food_items fi ON fi.id = sp.food_item_id
              WHERE sp.supplier_id = s.id
                AND sp.is_deleted = false
                AND fi.is_deleted = false
            )
          )
        )
        FROM (
          SELECT s.*
          FROM suppliers s
          WHERE s.is_deleted = false
            ${entityType === "driver" && driversIds.length > 0
          ? sql`AND s.kitchen_id IN (
                        SELECT uk.kitchen_id
                        FROM user_kitchens uk
                        WHERE uk.user_id = ANY(${sql.raw(
            `ARRAY[${driversIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
          )})
                          AND uk.is_deleted = false
                      )`
          : sql``
        }
            ${entityType === "b" && kitchenIds.length > 0
          ? sql`AND s.kitchen_id = ANY(${sql.raw(
            `ARRAY[${kitchenIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
          )})`
          : sql``
        }
            ${entityType === "a" && schoolIds.length > 0
          ? sql`AND s.kitchen_id IN (
                        SELECT mp.kitchen_id
                        FROM menu_plans mp
                        INNER JOIN menu_plan_beneficiaries mps ON mps.menu_plan_id = mp.id
                        WHERE mps.beneficiary_id = ANY(${sql.raw(
            `ARRAY[${schoolIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
          )})
                          AND mp.is_deleted = false
                          AND mps.is_deleted = false
                      )`
          : sql``
        }
          ORDER BY s.created_at DESC
          LIMIT 3
        ) s
      ), '[]'::jsonb)
    `
      : sql`'[]'::jsonb`;


  const stepTomorrowField =
    view === "home" && entityType === "kitchen" && kitchenIds.length > 0 && endDate
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
        `ARRAY[${kitchenIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
      )})
            AND dr.entity_type = 'kitchen'
            AND dr.date = ${addDays(new Date(endDate), 1).toISOString().split("T")[0]}
        ) sr
        INNER JOIN master_steps ms ON ms.id = sr.step_id
      ), '[]'::jsonb)
    `
      : sql`'[]'::jsonb`;


  const { where, meta } = await buildPaginatedWhere({
    table: dailyReports,
    tableName: "daily_reports",
    base: {
      entityType: entityType,
      entityId,
      status,
      date: {
        gte: startDate ?? undefined,
        lte: endDate ?? undefined,
      },
    },
    extra: [
      driversIds.length > 0 && entityType === "driver"
        ? sql`${dailyReports.entityId} = ANY(${sql.raw(`ARRAY[${driversIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`
        : undefined,
      kitchenIds.length > 0 && entityType === "kitchen"
        ? sql`${dailyReports.entityId} = ANY(${sql.raw(`ARRAY[${kitchenIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`
        : undefined,
      schoolIds.length > 0 && (entityType === "school" || entityType === "beneficiary")
        ? sql`${dailyReports.entityId} = ANY(${sql.raw(`ARRAY[${schoolIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`
        : undefined,
      params?.menuPlanName
        ? sql`${dailyReports.menuPlanId} IN (
            SELECT id FROM menu_plans
            WHERE name ILIKE ${`%${params?.menuPlanName}%`}
          )`
        : undefined,
    ],
    page,
    limit,
  });

  let widgets: Record<string, any[]> = {
    threeDaysMenu: [],
    eventReports: [],
    topSuppliers: [],
    stepTomorrow: [],
    beneficiaries: [],
  };


  if (view === "home") {
    const [
      threeDaysMenuData,
      eventReportsData,
      topSuppliersData,
      stepTomorrowData,
    ] = await Promise.all([
      db.execute(sql`SELECT (${threeDaysMenuField}) AS "threeDaysMenu"`),
      db.execute(sql`SELECT (${eventReportsField}) AS "eventReports"`),
      db.execute(sql`SELECT (${topSuppliersField}) AS "topSuppliers"`),
      db.execute(sql`SELECT (${stepTomorrowField}) AS "stepTomorrow"`),
    ]);

    widgets = {
      threeDaysMenu: threeDaysMenuData?.rows?.[0]?.threeDaysMenu as any ?? [],
      eventReports: eventReportsData?.rows?.[0]?.eventReports as any ?? [],
      topSuppliers: topSuppliersData?.rows?.[0]?.topSuppliers as any ?? [],
      stepTomorrow: stepTomorrowData?.rows?.[0]?.stepTomorrow as any ?? [],
    };
  } else {
    const [
      beneficiariesData,
      stepTomorrowData
    ] = await Promise.all([
      db.execute(sql`SELECT (${schoolListField}) AS "beneficiaries"`),
      db.execute(sql`SELECT (${stepTomorrowField}) AS "stepTomorrow"`),
    ]);

    widgets = {
      beneficiaries: beneficiariesData?.rows?.[0]?.beneficiaries as any ?? [],
      stepTomorrow: stepTomorrowData?.rows?.[0]?.stepTomorrow as any ?? [],
    };
  }

  const includeBeneficiaries = view === "calendar";

  const data = await db
    .select({
      dailyReports,
      menuPlan: {
        id: menuPlans.id,
        name: menuPlans.name,
        planEndDate: menuPlans.planEndDate,
        planStartDate: menuPlans.planStartDate,
        beneficiaries: includeBeneficiaries
          ? sql`
          (
            SELECT json_agg(
              json_build_object(
                'id', b.id,
                'name', b.name,
                'address', b.address,
                'category', b.category,
                'imageURL', b.image_url,
                'smallPortion', b.small_portion,
                'largePortion', b.large_portion
              )
            )
            FROM menu_plan_beneficiaries mpb
            JOIN beneficiaries b ON b.id = mpb.beneficiary_id
            WHERE mpb.menu_plan_id = ${menuPlans.id}
              AND mpb.is_deleted = false
              AND b.is_deleted = false
          )
        `.as("beneficiaries")
          : sql`null`.as("beneficiaries"),
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
      suppliersFoodItem: {
        id: suppliersFoodItems.id,
      },
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
    .leftJoin(suppliersFoodItems, eq(menuPlans.id, suppliersFoodItems.menuPlanId))
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

  type Supplier = {
    id: string;
    address: string | null;
    name: string;
    description: string | null;
    phoneNumber: string | null;
  };

  const reportMap = new Map();

  data.forEach((row) => {
    const reportId = row.dailyReports.id;

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

    const sfiId = row.suppliersFoodItem?.id;
    const foodItemId = row.foodItem?.id;

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
        !foodRow.suppliers.some((s: Supplier) => s.id === row.supplier?.id)
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

      report.menuPlan = {
        date: planStartDate,
        ...rest,
      };
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

  console.log(widgets, "=====widgets=====");

  return {
    data: {
      agenda: finalGroupedData,
      ...(entityType !== "kitchen" ? {} : view === "home" ? widgets : { beneficiaries: widgets?.beneficiaries }),
      ...(entityType !== "kitchen" ? {} : view === "home" ? widgets : { stepTomorrow: widgets?.stepTomorrow }),
      ...(view === "home" && entityType === "beneficiary" ? { eventReports: widgets?.eventReports, threeDaysMenu: widgets.threeDaysMenu } : {}),
    },
    meta,
  };
}

export async function updateDailyReport(
  id: string,
  updates: Partial<DailyReportInsert>
) {
  const [updated] = await db
    .update(dailyReports)
    .set(updates)
    .where(eq(dailyReports.id, id))
    .returning();
  return updated;
}

export async function deleteDailyReport(id: string) {
  await db.delete(dailyReports).where(eq(dailyReports.id, id));
  return { message: "Daily report deleted successfully" };
}

export async function createStepReport(data: StepReportInsert) {
  const [inserted] = await db.insert(stepReports).values(data).returning();
  return inserted;
}

export async function getStepReportsByDailyReport(dailyReportId: string) {
  return db.query.stepReports.findMany({
    where: eq(stepReports.dailyReportId, dailyReportId),
  });
}

export async function updateStepReport(
  id: string,
  updates: Partial<StepReportInsert>
) {
  const [updated] = await db
    .update(stepReports)
    .set({ ...updates, isCompleted: true })
    .where(eq(stepReports.id, id))
    .returning();
  return updated;
}

export async function deleteStepReport(id: string) {
  await db.delete(stepReports).where(eq(stepReports.id, id));
  return { message: "Step report deleted successfully" };
}
