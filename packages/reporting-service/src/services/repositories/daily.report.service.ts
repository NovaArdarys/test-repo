import { db } from "@/db";
import { dailyReports, foodItems, masterSteps, menuFoodItem, menuPlans, menuPlanSchoolsKitchen, stepReports, suppliers } from "@/db/schemas";
import { kitchens, drivers, schools } from "@/db/schemas";
import { eq, and, desc, InferInsertModel, InferSelectModel, between, gte, lte, sql, inArray } from "drizzle-orm";
import { isEmpty } from "lodash";

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
  const menuPlanByEntity = await db.query.menuPlanSchoolsKitchen.findFirst({
    where:
      entityType === "school"
        ? eq(menuPlanSchoolsKitchen.schoolId, entityId)
        : eq(menuPlanSchoolsKitchen.kitchenId, entityId),
  });

  if (!menuPlanByEntity) return null;

  const menuPlan = await db.query.menuPlans.findFirst({
    where: and(
      eq(menuPlans.id, menuPlanByEntity.menuPlanId),
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
  return db.query.dailyReports.findFirst({
    where: eq(dailyReports.id, id),
    with: {
      menuPlan: {
        with: {
          menuFoodItem: {
            with: {
              foodItem: true
            }
          }
        }
      },
      steps: true
    }
  });
}

export async function getDailyReportsList(params?: {
  entityType?: string;
  entityId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  kitchenIds?: string[];
  schoolIds?: string[];
  page: number;  // default 1
  limit: number; // default 10
}) {

  console.log(params?.kitchenIds);

  const filters = [
    params?.entityType ? eq(dailyReports.entityType, params.entityType as any) : undefined,
    params?.entityId ? eq(dailyReports.entityId, params.entityId) : undefined,
    params?.status ? eq(dailyReports.status, params.status) : undefined,
    params?.startDate ? gte(dailyReports.date, params.startDate) : undefined,
    params?.endDate ? lte(dailyReports.date, params.endDate) : undefined,
    Array.isArray(params?.kitchenIds) && params.kitchenIds.length > 0 && params.entityType === "kitchen"
      ? inArray(dailyReports.entityId, params.kitchenIds)
      : undefined,
    Array.isArray(params?.schoolIds) && params.schoolIds.length > 0 && params.entityType === "school"
      ? inArray(dailyReports.entityId, params.schoolIds)
      : undefined
  ].filter(Boolean);

  const where = and(...filters);

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const offset = (page - 1) * limit;

  const data = await db.query.dailyReports.findMany({
    where,
    orderBy: desc(dailyReports.date),
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
                  type: true
                }
              },
              supplier: {
                columns: {
                  id: true,
                  address: true,
                  name: true,
                  description: true,
                  phoneNumber: true
                }
              },
            }
          },
        }
      },
      steps: {
        columns: {
          id: true,
          isCompleted: true,
          notes: true,
        },
        with: {
          step: {
            columns: {
              stepKey: true,
              stepName: true,
              stepOrder: true
            }
          },
        }
      }
    },
    limit,
    offset,
  });

  // === post-processing Map ===
  const groupedData = data.map(report => {
    if (!report.menuPlan) return report;

    const foodItemMap = new Map();

    report.menuPlan.suppliersFoodItems.forEach(sfi => {
      const foodItem = sfi.foodItem;
      const supplier = sfi.supplier;

      const foodItemId = foodItem?.id;

      if (foodItemId) {
        if (!foodItemMap.has(foodItemId)) {
          foodItemMap.set(foodItemId, {
            ...foodItem,
            suppliers: [] as any[],
          });
        }

        if (supplier) {
          foodItemMap.get(foodItemId).suppliers.push(supplier);
        }
      }
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
        ...step
      }))
    };
  });

  const total = groupedData.length || 0;

  return {
    data: groupedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
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
