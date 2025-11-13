import { db } from "@/db";
import { foodItems, kitchens, menuPlans, menuPlanBeneficiaries, menuFoodItem, beneficiaries, dailyReports, stepReports, drivers, masterSteps, suppliersFoodItems } from "@/db/schemas";
import { eq, and, sql, desc, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { FoodItem } from "./food.item.service";
import { isEmpty } from "lodash";
import { buildPaginatedWhere } from "@/utils/pagination";

export type MenuPlanBeneficiaries = InferSelectModel<typeof menuPlanBeneficiaries>;
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
    schoolIds = [],
    entityType = "kitchen",
    menuPlanName
}: {
    page: number;
    limit: number;
    villageId?: string;
    status?: string;
    isDeleted?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    kitchenIds?: string[];
    schoolIds?: string[];
    entityType?: string;
    menuPlanName?: string;
}) {

    const { where, meta } = await buildPaginatedWhere({
        table: menuPlans,
        tableName: "menu_plans",
        base: {
            isDeleted,
            villageId,
            status,
            planStartDate: { gte: startDate ?? undefined },
            planEndDate: { lte: endDate ?? undefined },
            name: menuPlanName ? { ilike: `%${menuPlanName}%` } : undefined,
            // kitchenId: !isEmpty(kitchenIds) && entityType === "kitchen"
            //     ? { in: kitchenIds }
            //     : sql`${menuPlans.kitchenId} IS NOT NULL`,
        },
        extra: [
            entityType === "kitchen" && isEmpty(kitchenIds)
                ? sql`${menuPlans.kitchenId} IS NOT NULL`
                : undefined,
            !isEmpty(schoolIds) && (entityType === "school" || entityType === "beneficiary")
                ? sql`${menuPlans.id} IN (
          SELECT menu_plan_id 
          FROM menu_plan_beneficiaries
          WHERE beneficiary_id = ANY(ARRAY[${sql.raw(
                    schoolIds.map((id) => `'${id}'`).join(",")
                )}]::uuid[])
        )`
                : undefined,
        ],
        page,
        limit,
    });

    console.log(where?.getSQL(), "==== sql ======");


    const data = await db.query.menuPlans.findMany({
        where: () => where,
        columns: {
            id: true,
            name: true,
            kitchenId: true,
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
            menuPlanBeneficiaries: {
                with: {
                    beneficiary: {
                        columns: {
                            id: true,
                            address: true,
                            name: true,
                            phoneNumber: true,
                            updatedAt: true
                        }
                    },
                }
            },
        },
        orderBy: (table) => sql`${table.planStartDate} ASC`,
        offset: (page - 1) * limit,
        limit,
    });

    const groupedData = data.map((report) => {
        const foodItemMap = new Map<string, any>();
        report.suppliersFoodItems.forEach((sfi) => {
            const foodItem = { ...sfi.foodItem, id: sfi.id, foodId: sfi.foodItem.id };
            const supplier = sfi.supplier;
            if (!foodItem) return;

            const fi = foodItemMap.get(foodItem.id) ?? { ...foodItem, suppliers: [] };
            if (supplier) fi.suppliers.push(supplier);
            foodItemMap.set(foodItem.id, fi);
        });

        const beneficiaryMap = new Map<string, any>();
        report.menuPlanBeneficiaries.forEach((mpsk) => {
            if (mpsk.beneficiary?.id) beneficiaryMap.set(mpsk.beneficiary.id, { ...mpsk.beneficiary, portion: 0 });
        });

        const { menuPlanBeneficiaries, suppliersFoodItems, planEndDate, planStartDate, ...menuPlan } = report;

        return {
            ...menuPlan,
            date: planStartDate,
            foodItems: Array.from(foodItemMap.values()),
            beneficiaries: Array.from(beneficiaryMap.values()),
        };
    });

    return {
        data: groupedData,
        meta,
    };
}

export async function getMenuPlanById(
    id: string,
    kitchenIds?: string[]
): Promise<{ data: any | null; meta: { total: number; page: number; limit: number; }; }> {
    // Ambil data utama menu plan
    const data = await db.query.menuPlans.findFirst({
        where: (menuPlans, { eq, and }) =>
            and(eq(menuPlans.id, id), eq(menuPlans.isDeleted, false)),
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
                    }
                }
            },
            menuPlankitchen: true,
            menuPlanBeneficiaries: {
                with: {
                    beneficiary: {
                        columns: {
                            id: true,
                            address: true,
                            name: true,
                            phoneNumber: true,
                            updatedAt: true
                        }
                    },
                }
            }
        }
    });

    if (!data) {
        return {
            data: null,
            meta: { total: 0, page: 1, limit: 1 }
        };
    }

    const foodItemMap = new Map<string, any>();
    data.suppliersFoodItems.forEach((sfi) => {
        const foodItem = { ...sfi.foodItem, id: sfi.id, foodId: sfi.foodItem.id };
        const supplier = sfi.supplier;
        if (!foodItem) return;

        const fi = foodItemMap.get(foodItem.id) ?? { ...foodItem, suppliers: [] };
        if (supplier) fi.suppliers.push(supplier);
        foodItemMap.set(foodItem.id, fi);
    });

    const beneficiaryMap = new Map<string, any>();
    data.menuPlanBeneficiaries.forEach((mpsk) => {
        if (mpsk.beneficiary?.id)
            beneficiaryMap.set(mpsk.beneficiary.id, {
                ...mpsk.beneficiary,
                portion: 0,
            });
    });

    const { menuPlanBeneficiaries, suppliersFoodItems, planEndDate, planStartDate, ...menuPlan } = data;

    const formattedData = {
        ...menuPlan,
        date: planStartDate,
        kitchenId: kitchenIds?.[0] ?? null,
        foodItems: Array.from(foodItemMap.values()),
        beneficiaries: Array.from(beneficiaryMap.values())
    };

    return {
        data: formattedData,
        meta: {
            total: 1,
            page: 1,
            limit: 1
        }
    };
}


async function validateEntity(entityType: string, entityId: string) {
    switch (entityType) {
        case "kitchen":
            return db.query.kitchens.findMany({ where: eq(kitchens.id, entityId) });
        case "driver":
            return db.query.drivers.findMany({ where: eq(drivers.id, entityId) });
        case "school":
            return db.query.beneficiaries.findMany({ where: eq(beneficiaries.id, entityId) });
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
        const beneficiariesByKitchen = await trx
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.kitchenId, kitchenId));
        const driverByKitchen = await trx
            .select()
            .from(drivers)
            .where(eq(drivers.kitchenId, kitchenId));
        const planDates = (dates || []).map((d) => new Date(d));

        const allDailyReports: any[] = [];

        for (const date of planDates) {
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
                    kitchenId: kitchenId
                })
                .returning();

            if (beneficiariesByKitchen.length > 0) {
                await trx.insert(menuPlanBeneficiaries).values(
                    beneficiariesByKitchen.map((beneficiary) => ({
                        beneficiaryId: beneficiary.id,
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
            for (const school of beneficiariesByKitchen) {
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
            // driver(s)
            // for (const driver of driverByKitchen) {
            //     const [dailyDriver] = await trx
            //         .insert(dailyReports)
            //         .values({
            //             date: newPlan.planStartDate,
            //             entityId: driver.id,
            //             entityType: "driver",
            //             menuPlanId: newPlan.id,
            //             status: "PENDING",
            //             createdAt: newPlan.createdAt,
            //             createdBy: newPlan.createdBy,
            //         })
            //         .returning();

            //     allDailyReports.push(dailyDriver);

            //     const schoolSteps = await planEntity("driver");
            //     await trx.insert(stepReports).values(
            //         schoolSteps.map((step) => ({
            //             dailyReportId: dailyDriver.id,
            //             stepId: step.id,
            //             isCompleted: false,
            //             createdBy: newPlan.createdBy,
            //         }))
            //     );
            // }
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

        await trx.delete(menuPlanBeneficiaries).where(eq(menuPlanBeneficiaries.menuPlanId, id));
        if (kitchenId) {
            const beneficiariesByKitchen = await trx.select().from(beneficiaries).where(eq(beneficiaries.kitchenId, kitchenId));
            if (beneficiariesByKitchen.length > 0) {
                await Promise.all(
                    beneficiariesByKitchen.map((beneficiary) =>
                        trx.insert(menuPlanBeneficiaries).values({
                            menuPlanId: updatedPlan.id,
                            beneficiaryId: beneficiary.id,
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
                const beneficiariesByKitchen = await trx.select().from(beneficiaries).where(eq(beneficiaries.kitchenId, kitchenId));
                for (const school of beneficiariesByKitchen) {
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
        school: MenuPlanBeneficiaries;
        kitchen: MenuPlanBeneficiaries;
    }>
> {
    const distributionDetails = await db.select({
        distributionId: menuPlanBeneficiaries.id,
        beneficiaries: beneficiaries,
        kitchen: kitchens,
    })
        .from(menuPlanBeneficiaries)
        .innerJoin(beneficiaries, eq(menuPlanBeneficiaries.beneficiaryId, beneficiaries.id))
        .innerJoin(menuPlans, eq(menuPlanBeneficiaries.menuPlanId, menuPlans.id))
        .innerJoin(kitchens, eq(menuPlans.kitchenId, kitchens.id))
        .where(and(
            eq(menuPlanBeneficiaries.menuPlanId, menuPlanId),
            eq(menuPlanBeneficiaries.isDeleted, false),
            eq(beneficiaries.isDeleted, false),
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
