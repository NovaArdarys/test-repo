import { db } from "@/db";
import { foodItems, kitchens, menuPlans, menuPlanBeneficiaries, menuFoodItem, beneficiaries, dailyReports, stepReports, drivers, masterSteps, suppliersFoodItems } from "@/db/schemas";
import { eq, and, sql, desc, InferSelectModel, InferInsertModel, inArray } from "drizzle-orm";
import { FoodItem } from "./food.item.service";
import { isEmpty } from "lodash";
import { buildPaginatedWhere } from "@/utils/pagination";

type ExpandedStep = {
    stepId: string;
    subDomain: string | null;
    stepKey: "preparationTool" | "preparation" | "cooking" | "packaging" | "pickup" | "delivery" | "confirmation" | "receive" | "receive_big_class" | "receive_big_portion" | "receive_small_class" | "receive_small_portion" | "inspection" | "inspection_before" | "inspection_after" | "distribution" | "alergic";
};
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

    const cleanVillageId = villageId && villageId.trim() !== "" ? villageId : undefined;


    const { where, meta } = await buildPaginatedWhere({
        table: menuPlans,
        tableName: "menu_plans",
        base: {
            isDeleted,
            villageId: cleanVillageId,
            status,
            planStartDate: { gte: startDate ?? undefined },
            planEndDate: { lte: endDate ?? undefined },
            name: menuPlanName ? { ilike: `%${menuPlanName}%` } : undefined,
            // kitchenId: !isEmpty(kitchenIds) && entityType === "kitchen"
            //     ? { in: kitchenIds }
            //     : sql`${menuPlans.kitchenId} IS NOT NULL`,
        },
        extra: [
            !isEmpty(kitchenIds) && entityType === "kitchen"
                ? sql`${menuPlans.kitchenId} = ANY(ARRAY[${sql.raw(
                    kitchenIds.map((id) => `'${id}'`).join(",")
                )}]::uuid[])`
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
            // consumptionNote: {
            //     columns: {
            //         note: true,
            //         reason: true,
            //     },
            // },
            menuFoodItem: {
                with: {
                    foodConsumtions: {
                        columns: {
                            quantity: true,
                            unit: true
                        },
                        where: (fields, { and, eq }) =>
                            and(
                                eq(fields.isDeleted, false),
                            ),
                    },
                    foodItem: {
                        with: {
                            suppliers: {
                                where: (sfi, { and, eq }) =>
                                    and(
                                        eq(sfi.isDeleted, false),
                                        eq(sfi.menuPlanId, menuPlans.id)
                                    ),
                                with: {
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
                        columns: {
                            id: true,
                            description: true,
                            name: true,
                            type: true
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
        report.menuFoodItem.forEach((sfi) => {
            const foodItem = { ...sfi.foodItem, id: sfi.id, foodId: sfi.foodItem.id };
            const supplier = sfi.foodItem.suppliers;
            const foodWaste = sfi.foodConsumtions?.[0] ? {
                quantity: sfi.foodConsumtions?.[0].quantity,
                unit: sfi.foodConsumtions?.[0].unit,
                note: "",
                reason: "",
            } : {
                quantity: "0",
                unit: "",
                note: "",
                reason: "",
            };
            if (!foodItem) return;

            const fi = foodItemMap.get(foodItem.id) ?? { ...foodItem, suppliers: [], foodWaste: {} };
            if (supplier) fi.suppliers = supplier;
            if (foodWaste) fi.foodWaste = foodWaste;
            foodItemMap.set(foodItem.id, fi);
        });

        const beneficiaryMap = new Map<string, any>();
        report.menuPlanBeneficiaries.forEach((mpsk) => {
            if (mpsk.beneficiary?.id) beneficiaryMap.set(mpsk.beneficiary.id, { ...mpsk.beneficiary, portion: 0 });
        });

        const { menuPlanBeneficiaries, menuFoodItem, planEndDate, planStartDate, ...menuPlan } = report;

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
            menuFoodItem: {
                with: {
                    foodConsumtions: {
                        columns: {
                            quantity: true,
                            unit: true
                        },
                        where: (fields, { and, eq }) =>
                            and(
                                eq(fields.isDeleted, false),
                            ),
                    },
                    foodItem: {
                        with: {
                            suppliers: {
                                with: {
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
                            }
                        },
                        columns: {
                            id: true,
                            description: true,
                            name: true,
                            type: true
                        }
                    },
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
    data.menuFoodItem.forEach((sfi) => {
        const foodItem = { ...sfi.foodItem, id: sfi.id, foodId: sfi.foodItem.id };
        const supplier = sfi.foodItem.suppliers;
        const foodWaste = sfi.foodConsumtions?.[0] ? {
            quantity: sfi.foodConsumtions?.[0].quantity,
            unit: sfi.foodConsumtions?.[0].unit,
            note: "",
            reason: "",
        } : {
            quantity: "0",
            unit: "",
            note: "",
            reason: "",
        };
        if (!foodItem) return;

        const fi = foodItemMap.get(foodItem.id) ?? { ...foodItem, suppliers: [], foodWaste: {} };
        if (supplier) fi.suppliers = supplier;
        if (foodWaste) fi.foodWaste = foodWaste;
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

    const { menuPlanBeneficiaries, menuFoodItem, planEndDate, planStartDate, ...menuPlan } = data;

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

async function expandStepsForEntity(entity: "kitchen" | "beneficiary") {
    const steps = await planEntity(entity);

    return steps.map(step => {
        const list = Array.isArray(step.subDomains) ? step.subDomains : [];

        if (list.length === 0) {
            return [{ stepId: step.id, subDomain: null }];
        }

        return list.map(sub => ({
            stepId: step.id,
            subDomain: sub,
        }));
    }).flat() as ExpandedStep[];
}

async function planEntity(entityType: string) {
    return db.query.masterSteps.findMany({ where: and(eq(masterSteps.entityType, entityType as any), eq(masterSteps.isDeleted, false)) });
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
        const beneficiariesByKitchen = await trx
            .select()
            .from(beneficiaries)
            .where(and(eq(beneficiaries.kitchenId, kitchenId), eq(beneficiaries.status, "AKTIF")));
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
                        largeDeliveryTime: beneficiary.largeDeliveryTime,
                        smallDeliveryTime: beneficiary.smallDeliveryTime,
                        largePortion: beneficiary.largePortion,
                        smallPortion: beneficiary.smallPortion
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
                    portionType: "DEFAULT",
                    status: "PENDING",
                    createdAt: newPlan.createdAt,
                    createdBy: newPlan.createdBy,
                })
                .returning();

            allDailyReports.push(dailyKitchen);

            const kitchenSteps = await planEntity("kitchen");

            const expandedKitchenSteps: ExpandedStep[] = kitchenSteps.map(step => {
                const list = Array.isArray(step.subDomains) ? step.subDomains : [];

                if (list.length === 0) {
                    return [{ stepId: step.id, subDomain: null, stepKey: step.stepKey }];
                }

                return list.map(sub => ({
                    stepId: step.id,
                    subDomain: sub,
                    stepKey: step.stepKey
                }));
            }).flat();

            console.log(expandedKitchenSteps, "=====expandedKitchenSteps=====", kitchenSteps);


            await trx.insert(stepReports).values(
                expandedKitchenSteps.map((item) => ({
                    dailyReportId: dailyKitchen.id,
                    stepId: item.stepId,
                    isCompleted: false,
                    createdBy: newPlan.createdBy,
                    subDomain: item.subDomain,
                }))
            );

            // school(s)
            for (const beneficiary of beneficiariesByKitchen) {
                const beneficiaryDailyReports: typeof allDailyReports = [];

                if (beneficiary?.smallPortion && beneficiary?.smallPortion > 0) {
                    const [smallReport] = await trx
                        .insert(dailyReports)
                        .values({
                            date: newPlan.planStartDate,
                            entityId: beneficiary.id,
                            entityType: "beneficiary",
                            menuPlanId: newPlan.id,
                            portionType: "SMALL",
                            status: "PENDING",
                            createdAt: newPlan.createdAt,
                            createdBy: newPlan.createdBy,
                        })
                        .returning();

                    beneficiaryDailyReports.push(smallReport);
                }

                if (beneficiary.largePortion && beneficiary.largePortion > 0) {
                    const [largeReport] = await trx
                        .insert(dailyReports)
                        .values({
                            date: newPlan.planStartDate,
                            entityId: beneficiary.id,
                            entityType: "beneficiary",
                            menuPlanId: newPlan.id,
                            portionType: "LARGE",
                            status: "PENDING",
                            createdAt: newPlan.createdAt,
                            createdBy: newPlan.createdBy,
                        })
                        .returning();

                    beneficiaryDailyReports.push(largeReport);
                }

                if (beneficiaryDailyReports.length === 0) {
                    const [defaultReport] = await trx
                        .insert(dailyReports)
                        .values({
                            date: newPlan.planStartDate,
                            entityId: beneficiary.id,
                            entityType: "beneficiary",
                            menuPlanId: newPlan.id,
                            portionType: "DEFAULT",
                            status: "PENDING",
                            createdAt: newPlan.createdAt,
                            createdBy: newPlan.createdBy,
                        })
                        .returning();

                    beneficiaryDailyReports.push(defaultReport);
                }

                allDailyReports.push(...beneficiaryDailyReports);

                const beneficiarySteps = await planEntity("beneficiary");
                const expandedBeneficiarySteps: ExpandedStep[] = beneficiarySteps.map(step => {
                    const list = Array.isArray(step.subDomains) ? step.subDomains : [];

                    if (list.length === 0) {
                        return [{ stepId: step.id, subDomain: null, stepKey: step.stepKey }];
                    }

                    return list.map(sub => ({
                        stepId: step.id,
                        subDomain: sub,
                        stepKey: step.stepKey
                    }));
                }).flat();
                for (const report of beneficiaryDailyReports) {
                    // beneficiary
                    await trx.insert(stepReports).values(
                        expandedBeneficiarySteps.map((step) => ({
                            dailyReportId: report.id,
                            stepId: step.stepId,
                            isCompleted: false,
                            createdBy: newPlan.createdBy,
                            subDomain: step.subDomain,
                        }))
                    );
                }
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
        if (foodItemsIds?.length) {
            await trx.insert(menuFoodItem).values(
                foodItemsIds.map(foodId => ({
                    menuFoodPlanId: updatedPlan.id,
                    foodItemId: foodId,
                    createdAt: updatedPlan.updatedAt,
                    createdBy: updatedBy!,
                }))
            );
        }

        // Update beneficiaries
        await trx.delete(menuPlanBeneficiaries).where(eq(menuPlanBeneficiaries.menuPlanId, id));
        const beneficiariesByKitchen = kitchenId
            ? await trx.select().from(beneficiaries).where(eq(beneficiaries.kitchenId, kitchenId))
            : [];

        if (beneficiariesByKitchen.length) {
            await trx.insert(menuPlanBeneficiaries).values(
                beneficiariesByKitchen.map(b => ({
                    menuPlanId: updatedPlan.id,
                    beneficiaryId: b.id,
                    createdAt: updatedPlan.updatedAt,
                    createdBy: updatedBy!,
                }))
            );
        }

        const planDates = generateDates(data.planStartDate!, data.planEndDate!);
        await trx.delete(dailyReports).where(eq(dailyReports.menuPlanId, id));

        async function createStepsForDailyReport(daily: any, entity: "kitchen" | "beneficiary") {
            const expandedSteps = await expandStepsForEntity(entity);

            await trx.insert(stepReports).values(
                expandedSteps.map(es => ({
                    dailyReportId: daily.id,
                    stepId: es.stepId,
                    subDomain: es.subDomain,
                    isCompleted: false,
                    createdBy: updatedBy!,
                }))
            );
        }

        // KITCHEN
        if (kitchenId) {
            for (const date of planDates) {
                const [dailyKitchen] = await trx.insert(dailyReports).values({
                    date,
                    entityId: kitchenId,
                    entityType: "kitchen",
                    menuPlanId: updatedPlan.id,
                    status: "PENDING",
                    createdAt: updatedPlan.updatedAt,
                    createdBy: updatedBy!,
                }).returning();

                await createStepsForDailyReport(dailyKitchen, "kitchen");
            }
        }

        // BENEFICIARIES
        for (const school of beneficiariesByKitchen) {
            for (const date of planDates) {
                const [dailySchool] = await trx.insert(dailyReports).values({
                    date,
                    entityId: school.id,
                    entityType: "beneficiary",
                    menuPlanId: updatedPlan.id,
                    status: "PENDING",
                    createdAt: updatedPlan.updatedAt,
                    createdBy: updatedBy!,
                }).returning();

                await createStepsForDailyReport(dailySchool, "beneficiary");
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
