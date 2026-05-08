import { bcryptHash } from "@/utils/hashing";
import {
  users,
  userDetails,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserDetailInput,
  userKitchens,
  kitchens,
  provinces,
  beneficiaries,
  userBeneficiaries,
  userRoles,
  roles,
  drivers
} from "@/db/schemas";
import { and, eq, desc, sql, or, SQL } from "drizzle-orm";
import { db } from "@/db";
import { APIPagination, } from "@/types/paginations.type";
import ApiError from "@/utils/ApiError";
import * as HttpStatus from "http-status";
import { buildNameSearchQuery, buildPaginatedWhere } from "@/utils/pagination";

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
  role,
  kitchenId,
  isAppManager,
  author,
  orderBy = []
}: {
  page: number;
  limit: number;
  isActive?: boolean;
  name?: string;
  role?: string;
  kitchenId?: string;
  email?: string;
  isAppManager?: boolean;
  author?: string;
  orderBy?: any[];
}): Promise<APIPagination<UserRead>> {

  console.log("====sort====");

  const emailFilter =
    email ? sql`LOWER(${users.email}) ILIKE LOWER(${`%${email}%`})` : undefined;

  const nameFilter =
    name
      ? sql`${users.id} IN (
        SELECT user_id FROM user_details
        WHERE ${buildNameSearchQuery(name)}
      )`
      : undefined;

  const roleStr = typeof role === "string" ? role.toUpperCase() : "";
  const isDriverFilter = roleStr === "DRIVER" ? sql` OR ${users.id} IN (SELECT user_id FROM drivers WHERE is_deleted = false)` : sql``;
  const isKitchenFilter = roleStr === "KITCHEN" || roleStr === "DAPUR" ? sql` OR ${users.id} IN (SELECT user_id FROM user_kitchens WHERE is_deleted = false)` : sql``;
  const isBeneficiaryFilter = roleStr === "BENEFICIARY" || roleStr === "SEKOLAH" ? sql` OR ${users.id} IN (SELECT user_id FROM user_beneficiaries WHERE is_deleted = false)` : sql``;

  const roleFilter = role
    ? sql`(
      ${users.id} IN (
        SELECT ur.user_id
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE (r.name ILIKE ${`%${role}%`} OR CAST(r.id AS TEXT) = ${role})
      )
      ${isDriverFilter}
      ${isKitchenFilter}
      ${isBeneficiaryFilter}
    )`
    : undefined;

  const kitchenFilter = kitchenId
    ? sql`(${users.id} IN (SELECT user_id FROM user_kitchens WHERE kitchen_id = ${kitchenId} AND is_deleted = false) OR ${users.id} IN (SELECT user_id FROM drivers WHERE kitchen_id = ${kitchenId} AND is_deleted = false))`
    : undefined;

  let emailOrName: SQL | undefined;

  if (emailFilter && nameFilter) {
    emailOrName = sql`(${emailFilter} OR ${nameFilter})`;
  } else {
    emailOrName = emailFilter || nameFilter;
  }

  console.log(orderBy, "=====orderby=====");

  const { where, meta } = await buildPaginatedWhere({
    table: users,
    tableName: "users",
    base: {
      isDeleted: false,
      isActive,
    },
    extra: [
      emailOrName,
      roleFilter,
      kitchenFilter,
      !isAppManager
        ? sql`
          (
            ${users.createdBy} = ${author}
            AND (
              ${users.id} IN (SELECT user_id FROM user_kitchens WHERE is_deleted = false)
              OR ${users.id} IN (
                SELECT ub.user_id
                FROM user_beneficiaries ub
                JOIN beneficiaries b ON b.id = ub.beneficiary_id
                WHERE ub.is_deleted = false AND b.is_deleted = false
              )
              OR ${users.id} IN (SELECT user_id FROM drivers WHERE is_deleted = false)
            )
          )
        `
        : undefined,
    ],
    page,
    limit,
  });

  const data = await db.query.users.findMany({
    where: () => where,
    columns: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
      createdBy: true,
      updatedAt: true,
      updatedBy: true,
      isDeleted: true
    },
    with: {
      userDetails: true,
      drivers: true,
      userRoles: {
        with: {
          role: true,
        },
      },
    },
    orderBy: (table, helpers) => orderBy.map(fn => fn(table, helpers)),
    offset: (page - 1) * limit,
    limit,
  });

  const normalizedData = data.map((user) => ({
    ...user,
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt
        : new Date(user.updatedAt ?? user.createdAt),
  }));

  return {
    data: normalizedData,
    meta,
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
      isActive: users.isActive,
      dateOfBirth: userDetails.dateOfBirth,
      phoneNumber: userDetails.phoneNumber,
      address: userDetails.address,
      fullName: sql<string>`CONCAT(${userDetails.firstName}, ' ', ${userDetails.lastName})`,
      imageURL: userDetails.imageURL,
      driverProfile: {
        id: drivers.id,
        licenseNumber: drivers.licenseNumber,
        portionCapacity: drivers.portionCapacity
      },
      kitchen: {
        id: kitchens.id,
        name: kitchens.name,
        address: kitchens.address,
        lon: kitchens.lon,
        lat: kitchens.lat,
        province: provinces.name,
        imageURL: kitchens.imageURL,
      },

      beneficiaries: {
        id: beneficiaries.id,
        name: beneficiaries.name,
        address: beneficiaries.address,
        kitchenId: beneficiaries.kitchenId,
        phoneNumber: beneficiaries.phoneNumber,
      },

      role: {
        id: roles.id,
        name: roles.name,
        domain: roles.domain,
      },
    })
    .from(users)
    .innerJoin(userDetails, eq(userDetails.userId, users.id))

    .leftJoin(userKitchens, and(eq(userKitchens.userId, users.id), eq(userKitchens.isDeleted, false)))
    .leftJoin(drivers, and(eq(drivers.userId, users.id), eq(drivers.isDeleted, false)))

    .leftJoin(
      kitchens,
      eq(kitchens.id, sql`COALESCE(${userKitchens.kitchenId}, ${drivers.kitchenId})`)
    )

    .leftJoin(provinces, eq(provinces.id, kitchens.provinceId))
    .leftJoin(userBeneficiaries, and(eq(userBeneficiaries.userId, users.id), eq(userBeneficiaries.isDeleted, false)))
    .leftJoin(beneficiaries, and(eq(beneficiaries.id, userBeneficiaries.beneficiaryId), eq(beneficiaries.isDeleted, false)))
    .leftJoin(userRoles, and(eq(userRoles.userId, users.id), eq(userRoles.isDeleted, false)))
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.isDeleted, false)))
    .where(and(eq(users.id, id), eq(users.isDeleted, false)))
    .limit(1);

  const u = user[0];
  if (!u) return null;

  return u;
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

export async function getUserDetails(profileId: string): Promise<UserDetailRead | null> {
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
      eq(userDetails.userId, profileId),
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