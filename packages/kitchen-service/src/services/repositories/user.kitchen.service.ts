import { db } from "@/db";
import { userKitchens } from "@/db/schemas";
import { eq, and, InferSelectModel, InferInsertModel, inArray } from "drizzle-orm";

export type UserKitchen = InferSelectModel<typeof userKitchens>;
export type NewUserKitchen = Omit<
    InferInsertModel<typeof userKitchens>,
    'createdAt' | 'isDeleted'
>;

export async function getUserKitchens(userId: string) {
    return db.query.userKitchens.findMany({
        columns: {},
        with: {
            kitchen: {
                columns: {
                    id: true,
                    name: true,
                    address: true,
                },
            },
        },
        where: (userKitchens, { eq, and }) => and(
            eq(userKitchens.userId, userId),
            eq(userKitchens.isDeleted, false)
        ),
    });
}


export async function hasUserAccessToKitchen(userId: string, kitchenId: string): Promise<boolean> {
    const result = await db.query.userKitchens.findFirst({
        columns: {
            userId: true,
        },
        where: (userKitchens, { eq, and }) => and(
            eq(userKitchens.userId, userId),
            eq(userKitchens.kitchenId, kitchenId),
            eq(userKitchens.isDeleted, false)
        ),
    });

    return !!result;
}


export async function assignUserToKitchen(data: NewUserKitchen): Promise<void> {
    await db.insert(userKitchens)
        .values(data);
}

export async function unassignUserFromKitchen(userId: string, kitchenId: string): Promise<void> {
    await db.update(userKitchens)
        .set({
            isDeleted: true,
        })
        .where(and(
            eq(userKitchens.userId, userId),
            eq(userKitchens.kitchenId, kitchenId)
        ));
}

export async function syncUserKitchenByMerge({
    kitchenId,
    userId,
    userIds: newUserIds,
}: {
    kitchenId: string;
    userId: string;
    userIds: string[];
}): Promise<NewUserKitchen[]> {
    const results = await db.transaction(async (tx) => {
        const currentUsers = await tx.query.userKitchens.findMany({
            where: (uk, { eq, and }) => and(eq(uk.kitchenId, kitchenId), eq(uk.isDeleted, false)),
        });
        const currentUserIds = currentUsers.map(u => u.userId);

        const toAssign = newUserIds.filter(id => !currentUserIds.includes(id));
        const toUnassign = currentUserIds.filter(id => !newUserIds.includes(id));

        if (toUnassign.length > 0) {
            await tx.update(userKitchens)
                .set({ isDeleted: true })
                .where(
                    and(
                        eq(userKitchens.kitchenId, kitchenId),
                        inArray(userKitchens.userId, toUnassign)
                    )
                );
        }

        const inserted: NewUserKitchen[] = [];
        for (const userId of toAssign) {
            const [row] = await tx.insert(userKitchens)
                .values({ kitchenId, userId, createdBy: userId, createdAt: new Date() })
                .returning();
            if (!row) throw new Error(`Failed to assign user ${userId} to kitchen ${kitchenId}`);
            inserted.push(row);
        }

        return inserted;
    });

    return results;
}