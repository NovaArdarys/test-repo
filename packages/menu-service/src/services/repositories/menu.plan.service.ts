import { db } from "@/db";
import { foodItems, kitchens, menuPlans, menuPlanSchoolsKitchen, menuFoodItem, schools, dailyReports, stepReports, drivers, masterSteps, suppliersFoodItems } from "@/db/schemas";
import { APIPagination } from "@/types/paginations.type";
import { eq, and, sql, desc, SQLWrapper, InferSelectModel, InferInsertModel, or, inArray, lte, gte } from "drizzle-orm";
import { FoodItem } from "./food.item.service";
import { MenuPlanSchoolsKitchen } from "./menu.plan.schools.kitchen.service";
import { isEmpty } from "lodash";

export type MenuPlan = InferSelectModel<typeof menuPlans>;
export type NewMenuPlan = Omit<
    InferInsertModel<typeof menuPlans>,
    'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'status'
> & { status?: MenuPlan['status']; };
export type UpdateMenuPlan = Partial<Omit<NewMenuPlan, 'createdBy'>> & { updatedBy: string; };

export type PlanStatus = MenuPlan['status'];

export async function getMenuPlansList({
    page,
    limit,
    villageId,
    status,
    isDeleted = false,
    startDate,
    endDate,
    kitchenIds = [],
    entityType = 'kitchen',
    schoolIds = [],
}: {
    page: number;
    limit: number;
    villageId?: string;
    status?: PlanStatus;
    isDeleted?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    kitchenId?: string | null;
    kitchenIds?: string[];
    schoolIds?: string[];
    entityType?: string;
}): Promise<APIPagination<any>> {
    const offset = (page - 1) * limit;

    console.log(kitchenIds);

    const dataPromise = db.query.menuPlans.findMany({
        where: (table) =>
            and(
                eq(table.isDeleted, isDeleted),
                !isEmpty(kitchenIds) && entityType === 'kitchen'
                    ? sql`${table.id} IN (
                    SELECT menu_plan_id 
                    FROM menu_plan_schools_kitchen 
                    WHERE kitchen_id = ANY(ARRAY[${sql.raw(
                        kitchenIds?.map((id) => `'${id}'`).join(",")
                    )}]::uuid[])
                )`
                    : undefined,
                !isEmpty(schoolIds) && entityType === 'school'
                    ? sql`${table.id} IN (
                    SELECT menu_plan_id 
                    FROM menu_plan_schools_kitchen 
                    WHERE school_id = ANY(ARRAY[${sql.raw(
                        schoolIds?.map((id) => `'${id}'`).join(",")
                    )}]::uuid[])
                )`
                    : undefined,
                ...(villageId ? [eq(table.villageId, villageId)] : []),
                ...(status ? [eq(table.status, status)] : []),
                ...(startDate && endDate
                    ? [
                        and(
                            lte(table.planStartDate, endDate),
                            gte(table.planEndDate, startDate)
                        )
                    ]
                    : [])
            ),
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
            menuPlanSchoolsKitchen: {
                with: {
                    school: {
                        columns: {
                            id: true,
                            address: true,
                            name: true,
                            phoneNumber: true
                        }
                    },
                    kitchen: true,
                }
            },
        },
        limit,
        offset,
        orderBy: [desc(menuPlans.planStartDate)],
    });

    const whereParts: string[] = [`is_deleted = ${isDeleted}`];
    if (villageId) whereParts.push(`village_id = '${villageId}'`);
    if (status) whereParts.push(`status = '${status}'`);
    if (startDate && endDate) {
        whereParts.push(
            `(plan_start_date <= '${endDate}' AND plan_end_date >= '${startDate}')`
        );
    }


    const totalResult = await db.execute<{ total: number; }>(sql`
        SELECT COUNT(*) AS total
        FROM menu_plans
        WHERE ${sql.raw(whereParts.join(" AND "))}
    `);

    const data = await dataPromise;
    const total = totalResult.rowCount || 0;

    const groupedData = data.map(report => {
        const foodItemMap = new Map();

        report.suppliersFoodItems.forEach(sfi => {
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

        const schoolMap = new Map<string, any>();
        report.menuPlanSchoolsKitchen.forEach(mpsk => {
            const school = mpsk.school;
            if (!school?.id) return;

            if (!schoolMap.has(school.id)) {
                schoolMap.set(school.id, school);
            }
        });

        const groupedSchools = Array.from(schoolMap.values());


        const { suppliersFoodItems, menuPlanSchoolsKitchen, planStartDate, planEndDate, ...menuPlan } = report;
        return {
            ...menuPlan,
            date: planStartDate,
            foodItems: groupedFoodItems,
            schools: groupedSchools,
        };
    });

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

export async function getMenuPlanById(id: string, kitchenIds?: string[]): Promise<MenuPlan | null> {
    const data = await db.query.menuPlans.findFirst({
        where: (menuPlans, { eq, and }) => and(eq(menuPlans.id, id), eq(menuPlans.isDeleted, false),),
        with: {
            menuFoodItem: {
                with: {
                    foodItem: {
                        with: {
                            suppliers: {
                                with: {
                                    supplier: true
                                }
                            }
                        }
                    },
                }
            },
            menuPlanSchoolsKitchen: true,


        },
    });

    if (data) {
        const { menuFoodItem, ...p } = data;

        const formattedData = {
            ...p,
            kitchenId: kitchenIds?.[0] ?? null,
            foodItems: (menuFoodItem as any[]).map(({ foodItem }) => ({ ...foodItem, suppliers: (foodItem.suppliers as any[]).map(({ supplier, menuPlanId }) => ({ ...supplier, menuPlanId })) })),
        };


        return formattedData ?? null;
    }

    return null;
}


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


function generateDates(startDate: string, endDate: string) {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        dates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

export async function createMenuPlan(
    data: NewMenuPlan,
    kitchenId?: string,
    foodItemsIds?: Array<string>,
    dates?: Array<string>
): Promise<{ dailyReports: any[]; }> {
    if (!kitchenId) throw new Error("kitchenId is required");

    return db.transaction(async (trx) => {
        // Ambil sekolah berdasarkan kitchen
        const schoolsByKitchen = await trx
            .select()
            .from(schools)
            .where(eq(schools.kitchenId, kitchenId));
        const planDates = (dates || []).map((d) => new Date(d));

        const allDailyReports: any[] = [];

        for (const date of planDates) {
            // Buat menu plan utama
            const [newPlan] = await trx
                .insert(menuPlans)
                .values({
                    ...data,
                    planStartDate: new Date(date).toISOString(),
                    planEndDate: new Date(date).toISOString(),
                    villageId: "d3d3d3d3-3333-3333-3333-333333333334",
                    status: data.status!,
                    updatedAt: new Date(),
                    updatedBy: data.createdBy,
                })
                .returning();

            if (schoolsByKitchen.length > 0) {
                await trx.insert(menuPlanSchoolsKitchen).values(
                    schoolsByKitchen.map((school) => ({
                        kitchenId,
                        schoolId: school.id,
                        menuPlanId: newPlan.id,
                        createdAt: newPlan.createdAt,
                        createdBy: newPlan.createdBy,
                    }))
                );
            }

            if (foodItemsIds?.length) {
                await trx.insert(menuFoodItem).values(
                    foodItemsIds.map((foodId) => ({
                        foodItemId: foodId,
                        menuFoodPlanId: newPlan.id,
                        createdAt: newPlan.createdAt,
                        createdBy: newPlan.createdBy,
                    }))
                );
                await trx.insert(suppliersFoodItems).values(
                    foodItemsIds.map((foodId) => ({
                        supplierId: null,
                        foodItemId: foodId,
                        menuPlanId: newPlan.id,
                        createdAt: newPlan.createdAt,
                        createdBy: newPlan.createdBy,
                        updatedAt: newPlan.updatedAt,
                        updatedBy: newPlan.updatedBy,
                    }))
                );
            }
            // kitchen
            const [dailyKitchen] = await trx
                .insert(dailyReports)
                .values({
                    date: newPlan.planStartDate,
                    entityId: kitchenId,
                    entityType: "kitchen",
                    menuPlanId: newPlan.id,
                    status: "PENDING",
                    createdAt: newPlan.createdAt,
                    createdBy: newPlan.createdBy,
                })
                .returning();

            allDailyReports.push(dailyKitchen);

            const kitchenSteps = await planEntity("kitchen");
            await trx.insert(stepReports).values(
                kitchenSteps.map((step) => ({
                    dailyReportId: dailyKitchen.id,
                    stepId: step.id,
                    isCompleted: false,
                    createdBy: newPlan.createdBy,
                }))
            );

            // school(s)
            for (const school of schoolsByKitchen) {
                const [dailySchool] = await trx
                    .insert(dailyReports)
                    .values({
                        date: newPlan.planStartDate,
                        entityId: school.id,
                        entityType: "school",
                        menuPlanId: newPlan.id,
                        status: "PENDING",
                        createdAt: newPlan.createdAt,
                        createdBy: newPlan.createdBy,
                    })
                    .returning();

                allDailyReports.push(dailySchool);

                const schoolSteps = await planEntity("school");
                await trx.insert(stepReports).values(
                    schoolSteps.map((step) => ({
                        dailyReportId: dailySchool.id,
                        stepId: step.id,
                        isCompleted: false,
                        createdBy: newPlan.createdBy,
                    }))
                );
            }
        }

        return {
            dailyReports: allDailyReports,
        };
    });
}


export async function updateMenuPlan(
    id: string,
    data: UpdateMenuPlan,
    kitchenId?: string,
    foodItemsIds?: string[],
    updatedBy?: string,
): Promise<MenuPlan | null> {
    return db.transaction(async (trx) => {
        const [updatedPlan] = await trx.update(menuPlans)
            .set({
                ...data,
                updatedAt: new Date(),
                updatedBy,
            })
            .where(eq(menuPlans.id, id))
            .returning();

        if (!updatedPlan) return null;

        await trx.delete(menuFoodItem).where(eq(menuFoodItem.menuFoodPlanId, id));
        if (foodItemsIds && foodItemsIds.length > 0) {
            await Promise.all(
                foodItemsIds.map(foodId =>
                    trx.insert(menuFoodItem).values({
                        menuFoodPlanId: updatedPlan.id,
                        foodItemId: foodId,
                        createdAt: updatedPlan.updatedAt,
                        createdBy: updatedBy!,
                    })
                )
            );
        }

        await trx.delete(menuPlanSchoolsKitchen).where(eq(menuPlanSchoolsKitchen.menuPlanId, id));
        if (kitchenId) {
            const schoolsByKitchen = await trx.select().from(schools).where(eq(schools.kitchenId, kitchenId));
            if (schoolsByKitchen.length > 0) {
                await Promise.all(
                    schoolsByKitchen.map((school) =>
                        trx.insert(menuPlanSchoolsKitchen).values({
                            menuPlanId: updatedPlan.id,
                            kitchenId,
                            schoolId: school.id,
                            createdAt: updatedPlan.updatedAt,
                            createdBy: updatedBy!,
                        })
                    )
                );
            }
        }

        const planDates = generateDates(data?.planStartDate || "", data?.planEndDate || "");
        await trx.delete(dailyReports).where(eq(dailyReports.menuPlanId, id));
        for (const entity of ["kitchen", "school"]) {
            if (entity === "kitchen" && kitchenId) {
                for (const date of planDates) {
                    const [daily] = await trx.insert(dailyReports).values({
                        date,
                        entityId: kitchenId,
                        entityType: entity as any,
                        menuPlanId: updatedPlan.id,
                        status: "PENDING",
                        createdAt: updatedPlan.updatedAt,
                        createdBy: updatedBy!,
                    }).returning();

                    const stepsForEntity = await planEntity(entity);
                    for (const step of stepsForEntity) {
                        await trx.insert(stepReports).values({
                            dailyReportId: daily.id,
                            stepId: step.id,
                            isCompleted: false,
                            createdBy: updatedBy!,
                        });
                    }
                }
            } else if (kitchenId) {
                const schoolsByKitchen = await trx.select().from(schools).where(eq(schools.kitchenId, kitchenId));
                for (const school of schoolsByKitchen) {
                    for (const date of planDates) {
                        const [daily] = await trx.insert(dailyReports).values({
                            date,
                            entityId: school.id,
                            entityType: entity as any,
                            menuPlanId: updatedPlan.id,
                            status: "PENDING",
                            createdAt: updatedPlan.updatedAt,
                            createdBy: updatedBy!,
                        }).returning();

                        const stepsForEntity = await planEntity(entity);
                        for (const step of stepsForEntity) {
                            await trx.insert(stepReports).values({
                                dailyReportId: daily.id,
                                stepId: step.id,
                                isCompleted: false,
                                createdBy: updatedBy!,
                            });
                        }
                    }
                }
            }
        }

        return updatedPlan;
    });
}

export async function softDeleteMenuPlan(id: string, updatedBy: string): Promise<MenuPlan | null> {
    const [deletedPlan] = await db.update(menuPlans)
        .set({ isDeleted: true, updatedBy: updatedBy, updatedAt: new Date() })
        .where(eq(menuPlans.id, id))
        .returning();
    return deletedPlan ?? null;
}

export async function getFoodItemsByMenuPlanId(menuFoodPlanId: string): Promise<FoodItem[]> {
    const assignedItems = await db.select({
        id: foodItems.id,
        name: foodItems.name,
        type: foodItems.type,
        description: foodItems.description,
        isAvailable: foodItems.isAvailable,
        createdAt: foodItems.createdAt,
    })
        .from(menuFoodItem)
        .innerJoin(foodItems, eq(menuFoodItem.foodItemId, foodItems.id))
        .where(and(
            eq(menuFoodItem.menuFoodPlanId, menuFoodPlanId),
            eq(menuFoodItem.isDeleted, false),
            eq(foodItems.isDeleted, false)
        ))
        .orderBy(foodItems.name);

    return assignedItems as FoodItem[];
}

export async function getDistributionByMenuPlanId(menuPlanId: string): Promise<
    Array<{
        distributionId: string;
        school: MenuPlanSchoolsKitchen;
        kitchen: MenuPlanSchoolsKitchen;
    }>
> {
    const distributionDetails = await db.select({
        distributionId: menuPlanSchoolsKitchen.id,
        school: schools,
        kitchen: kitchens,
    })
        .from(menuPlanSchoolsKitchen)
        .innerJoin(schools, eq(menuPlanSchoolsKitchen.schoolId, schools.id))
        .innerJoin(kitchens, eq(menuPlanSchoolsKitchen.kitchenId, kitchens.id))
        .where(and(
            eq(menuPlanSchoolsKitchen.menuPlanId, menuPlanId),
            eq(menuPlanSchoolsKitchen.isDeleted, false),
            eq(schools.isDeleted, false),
            eq(kitchens.isDeleted, false)
        ));

    return distributionDetails as Array<any>;
}

export async function getMenuPlansByMenuId(): Promise<MenuPlan[]> {
    const plans = await db.select()
        .from(menuPlans)
        .where(and(
            eq(menuPlans.isDeleted, false)
        ))
        .orderBy(desc(menuPlans.planStartDate));

    return plans as MenuPlan[];
}

export async function updatePlanStatus(
    id: string,
    status: PlanStatus,
    updatedBy: string
): Promise<MenuPlan | null> {
    const [updatedPlan] = await db.update(menuPlans)
        .set({
            status: status,
            updatedBy: updatedBy,
            updatedAt: new Date()
        })
        .where(eq(menuPlans.id, id))
        .returning();

    return updatedPlan ?? null;
}
