import { db } from "@/db";
import { foodItems, menuFoodItem, suppliers, suppliersFoodItems, suppliersProducts } from "@/db/schemas";
import { buildPaginatedWhere } from "@/utils/pagination";
import { and, eq, ilike, inArray, like, or, sql } from "drizzle-orm";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { isEmpty } from "lodash";

export type Supplier = InferSelectModel<typeof suppliers>;
export type SupplierInsert = InferInsertModel<typeof suppliers>;

export async function getSuppliers({
  kitchenIds = [],
  limit = 10,
  page = 1,
  search,
}: {
  kitchenIds?: string[];
  search?: string;
  page: number;
  limit: number;
}) {
  const normalizedSearch = search?.toLowerCase().trim();
  const keywords = normalizedSearch ? normalizedSearch.split(/\s+/) : [];

  // const baseCondition = and(
  //   kitchenIds.length > 0 ? inArray(suppliers.kitchenId, kitchenIds) : undefined,
  //   eq(suppliers.isDeleted, false),
  //   eq(suppliersProducts.isDeleted, false)
  // );

  const baseCondition = and(
    eq(suppliers.isDeleted, false),
    eq(suppliersProducts.isDeleted, false)
  );

  const searchCondition =
    keywords.length > 0
      ? and(
        ...keywords.map(
          (word) =>
            sql`LOWER(${suppliers.name} || ' ' || COALESCE(${foodItems.name}, '')) LIKE ${'%' + word + '%'}`
        )
      )
      : undefined;

  const whereCondition = and(baseCondition, searchCondition);

  const totalData = await db
    .select({
      total: sql<number>`COUNT(DISTINCT ${suppliers.id})`.mapWith(Number),
    })
    .from(suppliers)
    .leftJoin(suppliersProducts, eq(suppliersProducts.supplierId, suppliers.id))
    .leftJoin(foodItems, eq(foodItems.id, suppliersProducts.foodItemId))
    .where(whereCondition);

  const data = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      kitchenId: suppliers.kitchenId,
      phone: suppliers.phoneNumber,
      address: suppliers.address,
      description: suppliers.description,
      imageURL: sql`COALESCE('', '')`,
      foodItems: sql`json_agg(
        json_build_object(
          'id', ${foodItems.id},
          'name', ${foodItems.name},
          'type', ${foodItems.type},
          'description', ${foodItems.description},
          'isAvailable', ${foodItems.isAvailable},
          'isDeleted', ${foodItems.isDeleted},
          'createdAt', ${foodItems.createdAt},
          'createdBy', ${foodItems.createdBy},
          'updatedAt', ${foodItems.updatedAt},
          'updatedBy', ${foodItems.updatedBy}
        )
      ) FILTER (WHERE ${foodItems.id} IS NOT NULL)`,
    })
    .from(suppliers)
    .leftJoin(suppliersProducts, eq(suppliersProducts.supplierId, suppliers.id))
    .leftJoin(foodItems, eq(foodItems.id, suppliersProducts.foodItemId))
    .where(whereCondition)
    .groupBy(suppliers.id)
    .limit(limit)
    .offset((page - 1) * limit);

  const total = totalData[0]?.total ?? 0;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function getSupplierById(id: string) {
  const data = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      kitchenId: suppliers.kitchenId,
      phone: suppliers.phoneNumber,
      address: suppliers.address,
      description: suppliers.description,
      imageURL: sql`COALESCE('', '')`,
      foodItems: sql`json_agg(
        json_build_object(
          'id', ${foodItems.id},
          'name', ${foodItems.name},
          'type', ${foodItems.type},
          'description', ${foodItems.description},
          'isAvailable', ${foodItems.isAvailable},
          'isDeleted', ${foodItems.isDeleted},
          'createdAt', ${foodItems.createdAt},
          'createdBy', ${foodItems.createdBy},
          'updatedAt', ${foodItems.updatedAt},
          'updatedBy', ${foodItems.updatedBy}
        )
      ) FILTER (WHERE ${foodItems.id} IS NOT NULL)`,
    })
    .from(suppliers)
    .leftJoin(suppliersProducts, eq(suppliersProducts.supplierId, suppliers.id))
    .leftJoin(foodItems, eq(foodItems.id, suppliersProducts.foodItemId))
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.isDeleted, false),
        eq(suppliersProducts.isDeleted, false)
      )
    )
    .groupBy(suppliers.id)
    .limit(1);

  return data[0] ?? null;
}


export async function createSupplier(
  data: SupplierInsert,
  foodItemsIds?: string[]
) {
  return db.transaction(async (trx) => {
    const [supplier] = await trx.insert(suppliers).values(data).returning();

    if (foodItemsIds && foodItemsIds.length > 0) {
      await Promise.all(
        foodItemsIds.map((foodId) =>
          trx.insert(suppliersProducts).values({
            supplierId: supplier.id,
            foodItemId: foodId,
            createdAt: supplier.createdAt,
            createdBy: supplier.createdBy,
            updatedAt: supplier.updatedAt,
            updatedBy: supplier.updatedBy,
          })
        )
      );
    }

    return supplier;
  });
}

export async function updateSupplier(
  id: string,
  data: Partial<SupplierInsert>,
  foodItemsIds?: string[]
) {
  return db.transaction(async (trx) => {
    const [supplier] = await trx
      .update(suppliers)
      .set(data)
      .where(eq(suppliers.id, id))
      .returning();

    if (foodItemsIds) {
      await trx
        .delete(suppliersProducts)
        .where(eq(suppliersProducts.supplierId, id));

      await Promise.all(
        foodItemsIds.map((foodId) =>
          trx.insert(suppliersProducts).values({
            supplierId: id,
            foodItemId: foodId,
            createdAt: supplier.createdAt,
            createdBy: supplier.createdBy,
            updatedAt: supplier.updatedAt,
            updatedBy: supplier.updatedBy,
          })
        )
      );
    }

    return supplier;
  });
}


export async function deleteSupplier(id: string) {
  return await db.update(suppliers)
    .set({ isDeleted: true })
    .where(eq(suppliers.id, id))
    .returning();
}
