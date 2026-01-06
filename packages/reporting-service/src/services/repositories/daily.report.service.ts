import { db } from "@/db";
import { dailyReports, foodItems, masterSteps, menuPlans, menuPlanBeneficiaries, stepReports, storage, suppliers, suppliersFoodItems } from "@/db/schemas";
import { kitchens, drivers, beneficiaries } from "@/db/schemas";
import { buildPaginatedWhere } from "@/utils/pagination";
import { addDays } from "date-fns";
import { eq, and, desc, InferInsertModel, InferSelectModel, between, gte, lte, sql, inArray, SQLWrapper } from "drizzle-orm";
import { isEmpty, orderBy } from "lodash";
import { getHomeWidgets } from "./additional/widgets.service";
import { SUB_DOMAIN_ORDER } from "../aditional/step.order.service";
import { buildOrderedDomainSteps } from "./additional/order.step.service";

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
  const report = await db.query.dailyReports.findFirst({
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
                  largePortion: true,
                },
              },
            },
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
          updatedAt: true,
          subDomain: true,
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
    },
  });

  if (!report) return null;
  if (!report.menuPlan) return report;

  const foodItemMap = new Map<string, any>();

  report.menuPlan.suppliersFoodItems.forEach((sfi) => {
    const foodItem = {
      ...sfi.foodItem,
      id: sfi.id,
      foodId: sfi.foodItem.id,
    };

    if (!foodItem) return;

    const existing = foodItemMap.get(foodItem.id) ?? {
      ...foodItem,
      suppliers: [],
    };

    if (sfi.supplier) {
      existing.suppliers.push(sfi.supplier);
    }

    foodItemMap.set(foodItem.id, existing);
  });

  const groupedFoodItems = Array.from(foodItemMap.values());

  const flatSteps = report.steps.map(({ step, ...s }) => ({
    id: s.id,
    isCompleted: s.isCompleted,
    notes: s.notes,
    imageURL: s.imageURL,
    createdAt: s.updatedAt,
    subDomain: s.subDomain ?? null,
    stepKey: step.stepKey,
    stepName: step.stepName,
    stepOrder: step.stepOrder,
  }));

  const orderedStepGroups = buildOrderedDomainSteps(flatSteps);

  const mainStep = orderedStepGroups[0] ?? null;
  const otherSteps = orderedStepGroups.slice(1);

  const {
    suppliersFoodItems,
    planEndDate,
    planStartDate,
    ...menuPlan
  } = report.menuPlan;

  return {
    menuPlan: {
      ...menuPlan,
      date: planStartDate,
      foodItems: groupedFoodItems,
    },

    steps: mainStep?.steps ?? [],
    otherSteps,
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
  domain?: string;
  entityId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  kitchenIds?: string[];
  schoolIds?: string[];
  driversIds?: string[];
  page?: number;
  limit?: number;
  menuPlanName?: string;
  view?: "home" | "calendar" | "delivery" | "report" | "profile";
  subDomains?: string[];
  entityType?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const {
    domain,
    entityId,
    status,
    startDate = today,
    endDate = today,
    kitchenIds = [],
    schoolIds = [],
    driversIds = [],
    subDomains = [],
    page = 1,
    limit = 10,
    view,
    menuPlanName,
  } = params ?? {};

  // const toISO = (d: Date) => d.toISOString().split("T")[0];
  // const tomorrow = toISO(addDays(new Date(endDate), 1));
  // const threeDaysAfterTomorrow = toISO(addDays(new Date(endDate), 3));

  const uuidArray = (ids: string[]) =>
    sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(",")}]::uuid[]`);

  const { where, meta } = await buildPaginatedWhere({
    table: dailyReports,
    tableName: "daily_reports",
    base: {
      entityType: domain,
      entityId,
      status,
      date: { gte: startDate, lte: endDate },
    },
    extra: [
      driversIds.length && domain === "driver"
        ? sql`${dailyReports.entityId} = ANY(${uuidArray(driversIds)})`
        : undefined,
      kitchenIds.length && domain === "kitchen"
        ? sql`${dailyReports.entityId} = ANY(${uuidArray(kitchenIds)})`
        : undefined,
      schoolIds.length &&
        (domain === "school" || domain === "beneficiary")
        ? sql`${dailyReports.entityId} = ANY(${uuidArray(schoolIds)})`
        : undefined,
      menuPlanName
        ? sql`${dailyReports.menuPlanId} IN (
            SELECT id FROM menu_plans
            WHERE name ILIKE ${`%${menuPlanName}%`}
          )`
        : undefined,
    ],
    page,
    limit,
  });

  const filterSubDomain =
    subDomains.length > 0
      ? sql`sr.sub_domains = ANY(${sql.raw(
        `ARRAY[${subDomains.map((d) => `'${d}'`).join(",")}]::text[]`
      )})`
      : sql`sr.sub_domains IS NULL`;

  const filterOtherSubDomain =
    subDomains.length > 0
      ? sql`sr.sub_domains != ANY(${sql.raw(
        `ARRAY[${subDomains.map((d) => `'${d}'`).join(",")}]::text[]`
      )})`
      : sql`sr.sub_domains IS NULL`;

  const rows = await db
    .select({
      dailyReports,
      menuPlan: {
        id: menuPlans.id,
        name: menuPlans.name,
        planStartDate: menuPlans.planStartDate,
        beneficiaries: sql`
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
            `,
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
        `,
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
                'subDomain', sr.sub_domains,
                'stepKey', ms.step_key,
                'stepName', ms.step_name,
                'stepOrder', ms.step_order,
                'imageURL', st.file_url,
                'createdAt', st.created_at
              )
              ORDER BY ms.step_order
            )
            FROM step_reports sr
            JOIN master_steps ms ON ms.id = sr.step_id
            LEFT JOIN storages st ON st.id = sr.storage_id
            WHERE sr.daily_report_id = ${dailyReports.id}
              AND ${filterSubDomain}
          ),
          '[]'::json
        )
      `,
      otherSteps: sql`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sr.id,
                'isCompleted', sr.is_completed,
                'notes', sr.notes,
                'subDomain', sr.sub_domains,
                'stepKey', ms.step_key,
                'stepName', ms.step_name,
                'stepOrder', ms.step_order,
                'imageURL', st.file_url,
                'createdAt', st.created_at
              )
              ORDER BY ms.step_order
            )
            FROM step_reports sr
            JOIN master_steps ms ON ms.id = sr.step_id
            LEFT JOIN storages st ON st.id = sr.storage_id
            WHERE sr.daily_report_id = ${dailyReports.id}
              AND ${filterOtherSubDomain}
          ),
          '[]'::json
        )
      `,
    })
    .from(dailyReports)
    .leftJoin(menuPlans, eq(dailyReports.menuPlanId, menuPlans.id))
    .leftJoin(suppliersFoodItems, eq(menuPlans.id, suppliersFoodItems.menuPlanId))
    .leftJoin(foodItems, eq(suppliersFoodItems.foodItemId, foodItems.id))
    .leftJoin(suppliers, eq(suppliersFoodItems.supplierId, suppliers.id))
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

  rows.forEach((row) => {
    const reportId = row.dailyReports.id;

    if (!reportMap.has(reportId)) {
      const orderedCurrentSteps = buildOrderedDomainSteps(
        (row.steps as any[]) ?? []
      );

      const orderedOtherSteps = buildOrderedDomainSteps(
        (row.otherSteps as any[]) ?? []
      );
      const mainStep = orderedCurrentSteps[0] ?? null;

      reportMap.set(reportId, {
        ...row.dailyReports,
        menuPlan: row.menuPlan
          ? { ...row.menuPlan, _foodItemMap: new Map() }
          : null,
        ...(mainStep ?? {
          steps: row.steps,
        }),
        otherSteps: orderedOtherSteps,
      });
    }

    const report = reportMap.get(reportId);
    const sfiId = row.suppliersFoodItem?.id;

    if (sfiId && report.menuPlan) {
      let food = report.menuPlan._foodItemMap.get(sfiId);

      if (!food) {
        food = {
          ...(row.foodItem ?? {}),
          id: sfiId,
          foodId: row.foodItem?.id,
          suppliers: [],
        };
        report.menuPlan._foodItemMap.set(sfiId, food);
      }

      if (
        row.supplier &&
        !food.suppliers.some((s: any) => s.id === row?.supplier?.id)
      ) {
        food.suppliers.push(row.supplier);
      }
    }
  });

  const finalGroupedData = Array.from(reportMap.values()).map((r) => {
    if (r.menuPlan) {
      r.menuPlan.foodItems = Array.from(r.menuPlan._foodItemMap.values());
      delete r.menuPlan._foodItemMap;

      const { planStartDate, ...rest } = r.menuPlan;
      r.menuPlan = { date: planStartDate, ...rest };
    }

    r.steps = orderBy(r.steps, "stepOrder", "asc");

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
      ...final
    } = r;

    return final;
  });

  const widgets = await getHomeWidgets({
    view,
    domain,
    endDate,
    kitchenIds,
    schoolIds,
    driversIds,
    subDomains,
  });

  return {
    data: {
      agenda: finalGroupedData,
      ...widgets,
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
