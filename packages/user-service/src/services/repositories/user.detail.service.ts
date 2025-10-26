import { bcryptHash } from "@/utils/hashing";
import {
  users,
  userDetails,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserDetailInput,
  userKitchens,
  kitchens,
  provinces
} from "@/db/schemas";
import { and, eq, desc, sql, or, SQL } from "drizzle-orm";
import { db } from "@/db";
import { APIPagination, } from "@/types/paginations.type";
import ApiError from "@/utils/ApiError";
import * as HttpStatus from "http-status";


type UserRead = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UserDetailRead = {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: Date | null;
};

export async function getUserByEmail({ email }: { email: string; }) {
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      password: users.password,
      isActive: users.isActive,
      isDeleted: users.isDeleted,
    })
    .from(users)
    .where(
      and(
        eq(users.email, email.toLowerCase()),
        eq(users.isDeleted, false)
      )
    )
    .limit(1);

  return user.length ? user[0] : null;
}

export async function getUsersList({
  page,
  limit,
  isActive,
  name,
  email,
}: {
  page: number;
  limit: number;
  isActive?: boolean;
  name?: string;
  email?: string;
}): Promise<APIPagination<UserRead>> {
  const offset = (page - 1) * limit;
  const whereConditions: SQL[] = [eq(users.isDeleted, false)];

  if (isActive !== undefined) {
    whereConditions.push(eq(users.isActive, isActive));
  }

  if (name) {
    whereConditions.push(
      sql`${users.email} ILIKE ${"%" + name.toLowerCase() + "%"}`
    );
  }

  // if (name) {
  //   whereConditions.push(
  //     or(
  //       sql`${userDetails.firstName} ILIKE ${"%" + name.toLowerCase() + "%"}`,
  //       sql`${userDetails.lastName} ILIKE ${"%" + name.toLowerCase() + "%"}`
  //     )
  //   );
  // }

  const finalWhere = whereConditions.length ? and(...whereConditions) : undefined;

  const dataPromise = db.query.users.findMany({
    where: finalWhere,
    with: {
      userDetails: true,
      userRoles: {
        with: {
          role: true,
        },
      },
    },
    orderBy: desc(users.createdAt),
    limit,
    offset,
  });

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(finalWhere)
    .execute();

  const [data, countResult] = await Promise.all([dataPromise, countPromise]);
  const total = Number(countResult[0].count);

  const normalizedData = data.map((user) => ({
    ...user,
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt
        : new Date(user.updatedAt ?? user.createdAt),
  }));

  return {
    data: normalizedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function createUser(data: CreateUserInput & { created_by: string; }) {
  const existingUser = await getUserByEmail({ email: data.email });
  if (existingUser) {
    throw new ApiError(HttpStatus.default.CONFLICT, { message: 'User with this email already exists.' });
  }

  const hashedPassword = await bcryptHash(data.password);

  const [newUser] = await db.insert(users).values({
    ...data,
    password: hashedPassword,
    email: data.email.toLowerCase(),
    updatedAt: new Date(),
    updatedBy: data.created_by,
  }).returning({ id: users.id });

  return { id: newUser.id, email: data.email };
}


export async function getUserById(id: string) {
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      dateOfBirth: userDetails.dateOfBirth,
      phoneNumber: userDetails.phoneNumber,
      fullName: sql<string>`CONCAT(${userDetails.firstName}, ' ', ${userDetails.lastName})`,
      kitchenId: kitchens.id,
      kitchenName: kitchens.name,
      kitchenAddress: kitchens.address,
      lon: kitchens.lon,
      lat: kitchens.lat,
      province: provinces.name,
    })
    .from(users)
    .innerJoin(userDetails, eq(userDetails.userId, users.id))
    .innerJoin(userKitchens, eq(userKitchens.userId, users.id))
    .innerJoin(kitchens, eq(kitchens.id, userKitchens.kitchenId))
    .innerJoin(provinces, eq(provinces.id, kitchens.provinceId))
    .where(and(
      eq(users.id, id),
      eq(users.isDeleted, false)
    ))
    .limit(1);

  return user.length
    ? {
      id: user?.[0]?.id,
      email: user?.[0]?.email,
      dateOfBirth: user?.[0]?.dateOfBirth,
      phoneNumber: user?.[0]?.phoneNumber,
      fullName: user?.[0]?.fullName,
      kitchenName: user?.[0]?.kitchenName,
      kitchenId: user?.[0]?.kitchenId,
      kitchenAddress: user?.[0]?.kitchenAddress,
      lon: user?.[0]?.lon,
      lat: user?.[0]?.lat,
      province: user?.[0]?.province,
    }
    : null;
}


export async function updateUser(id: string, data: UpdateUserInput & { updated_by: string; }) {
  if (data.email) {
    data.email = data.email.toLowerCase();
  }

  if (data.password) {
    data.password = await bcryptHash(data.password);
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(users.id, id),
      eq(users.isDeleted, false)
    ))
    .returning({ id: users.id });

  if (!updatedUser) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'User not found or cannot be updated.' });
  }

  return { id: updatedUser.id };
}

export async function deleteUser(id: string, updatedBy: string) {
  const [deletedUser] = await db
    .update(users)
    .set({
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
      updatedBy: updatedBy,
    })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!deletedUser) {
    throw new ApiError(HttpStatus.default.NOT_FOUND, { message: 'User not found or already deleted.' });
  }

  return { id: deletedUser.id };
}

export async function getUserDetails(userId: string): Promise<UserDetailRead | null> {
  const details = await db
    .select({
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      phoneNumber: userDetails.phoneNumber,
      address: userDetails.address,
      dateOfBirth: userDetails.dateOfBirth,
    })
    .from(userDetails)
    .where(and(
      eq(userDetails.userId, userId),
      eq(userDetails.isDeleted, false)
    ))
    .limit(1);

  return details.length
    ? {
      ...details[0],
      dateOfBirth: details[0].dateOfBirth ? new Date(details[0].dateOfBirth) : null
    }
    : null;
}


export async function updateOrCreateUserDetails(userId: string, data: UpdateUserDetailInput & { created_by: string, updated_by: string; }) {

  const existingDetail = await getUserDetails(userId);
  const now = new Date();

  if (existingDetail) {
    const [updated] = await db
      .update(userDetails)
      .set({
        ...data,
        updatedAt: now,
        updatedBy: data.updated_by,
        isDeleted: false,
      })
      .where(eq(userDetails.userId, userId))
      .returning({ userId: userDetails.userId });

    return updated ? updated.userId : null;

  } else {
    const [newDetail] = await db.insert(userDetails).values({
      userId: userId,
      ...data,
      updatedAt: now,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
    }).returning({ userId: userDetails.userId });

    return newDetail.userId;
  }
}