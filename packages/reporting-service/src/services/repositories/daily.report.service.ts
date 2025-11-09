import { db } from "@/db";
import { dailyReports, foodItems, masterSteps, menuFoodItem, menuPlans, menuPlanSchools, schoolClassroom, stepReports, storage, suppliers, suppliersFoodItems } from "@/db/schemas";
import { kitchens, drivers, schools } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
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
      return db.query.schools.findFirst({ where: eq(schools.id, entityId) });
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

async function planEntity(entityType: string) {
  return db.query.masterSteps.findMany({ where: eq(masterSteps.entityType, entityType as any) });
}

async function getMenuPlanDate(
  date: string,
  entityType: "school" | "kitchen",
  entityId: string
) {
  const menuPlanByEntity = await db.query.menuPlanSchools.findFirst({
    where:
      entityType === "school"
        ? eq(menuPlanSchools.schoolId, entityId)
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
  const {
    entityType,
    entityId,
    status,
    startDate,
    endDate,
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
            ${entityType === "school" && schoolIds.length > 0
          ? sql`AND mp.id IN (
                         SELECT mps.menu_plan_id
                         FROM menu_plan_schools mps
                         WHERE mps.school_id = ANY(${sql.raw(`ARRAY[${schoolIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})
                           AND mps.is_deleted = false
                       )`
          : sql``
        }
            AND mp.plan_start_date > ${endDate}
            AND mp.plan_start_date <= ${computedEndDate}
          ORDER BY mp.plan_start_date ASC
        ) t
      ), '[]'::jsonb)
    `.as("threeDaysMenu")
      : sql`'[]'::jsonb`.as("threeDaysMenu");



  const eventReportsField =
    view === "home"
      ? sql`
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', er.id,
            'name', er.name,
            'reportType', er.report_type,
            'date', er.date,
            'location', er.location,
            'description', er.description
          )
        )
        FROM (
          SELECT er.*
          FROM event_reports er
          WHERE er.is_deleted = false
            ${entityType === "driver" && driversIds.length > 0
          ? sql`AND er.report_type = 'driver'
                     AND er.entity_id = ANY(${sql.raw(`ARRAY[${driversIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
            ${entityType === "kitchen" && kitchenIds.length > 0
          ? sql`AND er.report_type = 'kitchen'
                     AND er.entity_id = ANY(${sql.raw(`ARRAY[${kitchenIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
            ${entityType === "school" && schoolIds.length > 0
          ? sql`AND er.report_type = 'school'
                     AND er.entity_id = ANY(${sql.raw(`ARRAY[${schoolIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`
          : sql``}
            AND er.date >= ${endDate}
            AND er.date <= ${computedEndDate}
          ORDER BY er.date DESC
          LIMIT 3
        ) er
      ), '[]'::jsonb)
    `.as("eventReports")
      : sql`'[]'::jsonb`.as("eventReports");


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
                        INNER JOIN menu_plan_schools mps ON mps.menu_plan_id = mp.id
                        WHERE mps.school_id = ANY(${sql.raw(
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
    `.as("topSuppliers")
      : sql`'[]'::jsonb`.as("topSuppliers");


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
            AND dr.is_deleted = false
            AND dr.date = ${addDays(new Date(endDate), 1).toISOString().split("T")[0]}
        ) sr
        INNER JOIN master_steps ms ON ms.id = sr.step_id
      ), '[]'::jsonb)
    `.as("stepTomorrow")
      : sql`'[]'::jsonb`.as("stepTomorrow");


  const { where, meta } = await buildPaginatedWhere({
    table: dailyReports,
    tableName: "daily_reports",
    base: {
      entityType,
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
      schoolIds.length > 0 && entityType === "school"
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

  const data = await db
    .select({
      dailyReports,
      menuPlan: {
        id: menuPlans.id,
        name: menuPlans.name,
        planEndDate: menuPlans.planEndDate,
        planStartDate: menuPlans.planStartDate,
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
      stepData: {
        id: stepReports.id,
        isCompleted: stepReports.isCompleted,
        notes: stepReports.notes,
      },
      stepMeta: {
        stepKey: masterSteps.stepKey,
        stepName: masterSteps.stepName,
        stepOrder: masterSteps.stepOrder,
      },
      storage: {
        imageURL: storage.fileUrl,
      },
      threeDaysMenu: threeDaysMenuField,
      eventReports: eventReportsField,
      topSuppliersField: topSuppliersField,
      stepsTomorrow: stepTomorrowField,
    })
    .from(dailyReports)
    .leftJoin(
      menuPlans,
      eq(dailyReports.menuPlanId, menuPlans.id)
    )
    .leftJoin(
      suppliersFoodItems,
      eq(menuPlans.id, suppliersFoodItems.menuPlanId)
    )
    .leftJoin(
      foodItems,
      eq(suppliersFoodItems.foodItemId, foodItems.id)
    )
    .leftJoin(
      suppliers,
      eq(suppliersFoodItems.supplierId, suppliers.id)
    )
    .leftJoin(
      stepReports,
      eq(dailyReports.id, stepReports.dailyReportId)
    )
    .leftJoin(
      masterSteps,
      eq(stepReports.stepId, masterSteps.id)
    )
    .leftJoin(
      storage,
      eq(stepReports.id, storage.entityId)
    )
    .where(where)
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
        menuPlan: row.menuPlan ? {
          ...row.menuPlan,
          _foodItemMap: new Map(),
        } : null,
        threeDaysMenu: row.threeDaysMenu ?? [],
        eventReports: row.eventReports ?? [],
        suppliers: row.topSuppliersField ?? [],
        stepsTomorrow: row.stepsTomorrow ?? [],
        _stepMap: new Map(),
      });
    }

    const report = reportMap.get(reportId);

    const sfiId = row.suppliersFoodItem?.id;
    const foodItemId = row.foodItem?.id;

    if (sfiId && report.menuPlan) {
      const existingFoodItem = report.menuPlan._foodItemMap.get(sfiId);

      if (!existingFoodItem) {
        const newFoodItem = {
          ...(row.foodItem ?? {}),
          id: sfiId,
          foodId: foodItemId,
          suppliers: [] as Supplier[],
        };

        if (row.supplier) {
          newFoodItem.suppliers.push(row.supplier);
        }

        report.menuPlan._foodItemMap.set(sfiId, newFoodItem);
      } else if (
        row.supplier &&
        !existingFoodItem.suppliers.some((s: any) => s.id === row?.supplier?.id)
      ) {
        existingFoodItem.suppliers.push(row.supplier);
      }
    }

    const stepReportId = row.stepData?.id;
    const fileUrl = row.storage?.imageURL;

    if (stepReportId) {
      let step = report._stepMap.get(stepReportId);

      if (!step) {
        step = {
          ...row.stepData,
          ...row.stepMeta,
          imageURLs: [] as string[],
        };
        report._stepMap.set(stepReportId, step);
      }

      if (fileUrl && !step.imageURLs.includes(fileUrl)) {
        step.imageURLs.push(fileUrl);
      }
    }
  });

  const finalGroupedData = Array.from(reportMap.values()).map(report => {

    if (report.menuPlan) {
      report.menuPlan.foodItems = Array.from(report.menuPlan._foodItemMap.values()).map((foodItem: any) => {
        const { ...restFoodItem } = foodItem;
        return restFoodItem;
      });
      delete report.menuPlan._foodItemMap;

      const { planEndDate, planStartDate, ...menuPlan } = report.menuPlan;
      report.menuPlan = {
        date: planStartDate,
        ...menuPlan,
      };
    }

    report.steps = orderBy(Array.from(report._stepMap.values()).map((step: any) => {
      const { ...restStep } = step;
      return restStep;
    }), "stepOrder", "asc");
    delete report._stepMap;

    const {
      id,
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
    data: finalGroupedData,
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
    .set(updates)
    .where(eq(stepReports.id, id))
    .returning();
  return updated;
}

export async function deleteStepReport(id: string) {
  await db.delete(stepReports).where(eq(stepReports.id, id));
  return { message: "Step report deleted successfully" };
}
