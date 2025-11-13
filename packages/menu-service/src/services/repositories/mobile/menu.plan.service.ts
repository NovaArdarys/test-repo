import { sql, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { db } from "@/db";
import { menuPlans } from "@/db/schemas";
import { buildPaginatedWhere } from "@/utils/pagination";
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
    startDate,
    endDate,
    kitchenIds = [],
    schoolIds = [],
    driverIds = [],
    entityType = "kitchen",
    menuPlanName,
}: {
    page: number;
    limit: number;
    startDate?: string | null;
    endDate?: string | null;
    kitchenIds?: string[];
    schoolIds?: string[];
    driverIds?: string[];
    entityType?: string;
    menuPlanName?: string;
}) {
    const { where, meta } = await buildPaginatedWhere({
        table: menuPlans,
        tableName: "menu_plans",
        base: {
            isDeleted: false,
            planStartDate: { gte: startDate ?? undefined },
            planEndDate: { lte: endDate ?? undefined },
            name: menuPlanName ? { ilike: `%${menuPlanName}%` } : undefined,
        },
        extra: [
            // 🔹 KITCHEN
            entityType === "kitchen" && !isEmpty(kitchenIds)
                ? sql`${menuPlans.kitchenId} = ANY(ARRAY[${sql.raw(
                    kitchenIds.map((id) => `'${id}'`).join(",")
                )}]::uuid[])`
                : undefined,

            // 🔹 DRIVER
            entityType === "driver" && !isEmpty(driverIds)
                ? sql`${menuPlans.kitchenId} IN (
            SELECT uk.kitchen_id
            FROM user_kitchens uk
            WHERE uk.user_id = ANY(ARRAY[${sql.raw(
                    driverIds.map((id) => `'${id}'`).join(",")
                )}]::uuid[])
              AND uk.is_deleted = false
          )`
                : undefined,

            // 🔹 SCHOOL
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

            // 🔹 Fallback: kalau kitchen kosong tapi entityType kitchen
            entityType === "kitchen" && isEmpty(kitchenIds)
                ? sql`${menuPlans.kitchenId} IS NOT NULL`
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
        // with: {
        //     suppliersFoodItems: {
        //         with: {
        //             foodItem: {
        //                 columns: {
        //                     id: true,
        //                     description: true,
        //                     name: true,
        //                     type: true,
        //                 },
        //             },
        //             supplier: {
        //                 columns: {
        //                     id: true,
        //                     address: true,
        //                     name: true,
        //                     description: true,
        //                     phoneNumber: true,
        //                 },
        //             },
        //         },
        //     },
        //     menuPlanBeneficiaries: {
        //         with: {
        //             beneficiary: {
        //                 columns: {
        //                     id: true,
        //                     address: true,
        //                     name: true,
        //                     phoneNumber: true,
        //                     updatedAt: true,
        //                 },
        //             },
        //         },
        //     },
        // },
        orderBy: (table) => sql`${table.planStartDate} ASC`,
        offset: (page - 1) * limit,
        limit,
    });

    // 🔧 Grouping logic
    const groupedData = data.map((report) => {
        const foodItemMap = new Map<string, any>();
        // report.suppliersFoodItems.forEach((sfi) => {
        //     const foodItem = {
        //         ...sfi.foodItem,
        //         id: sfi.id,
        //         foodId: sfi.foodItem.id,
        //     };
        //     const supplier = sfi.supplier;
        //     if (!foodItem) return;

        //     const fi = foodItemMap.get(foodItem.id) ?? {
        //         ...foodItem,
        //         suppliers: [],
        //     };
        //     if (supplier) fi.suppliers.push(supplier);
        //     foodItemMap.set(foodItem.id, fi);
        // });

        const schoolMap = new Map<string, any>();
        // report.menuPlanBeneficiaries.forEach((mpsk) => {
        //     if (mpsk.beneficiary?.id)
        //         schoolMap.set(mpsk.beneficiary.id, { ...mpsk.beneficiary, portion: 0 });
        // });

        const {
            // menuPlanBeneficiaries,
            // suppliersFoodItems,
            planEndDate,
            planStartDate,
            ...menuPlan
        } = report;

        return {
            ...menuPlan,
            date: planStartDate,
            // foodItems: Array.from(foodItemMap.values()),
            // schools: Array.from(schoolMap.values()),
        };
    });

    return {
        data: groupedData,
        meta,
    };
}


export async function getMenuPlanById(
    id: string,
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
            kitchenId: true
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

    const schoolMap = new Map<string, any>();
    data.menuPlanBeneficiaries.forEach((mpsk) => {
        if (mpsk.beneficiary?.id)
            schoolMap.set(mpsk.beneficiary.id, {
                ...mpsk.beneficiary,
                portion: 0,
            });
    });

    const { menuPlanBeneficiaries, suppliersFoodItems, planEndDate, planStartDate, ...menuPlan } = data;

    const formattedData = {
        ...menuPlan,
        date: planStartDate,
        foodItems: Array.from(foodItemMap.values()),
        beneficiaries: Array.from(schoolMap.values())
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
