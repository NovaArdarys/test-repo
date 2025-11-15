
import { bcryptHash } from "@/utils/hashing";
import { CreateUserInput, userDetails, userRoles, users, userSessions } from "@/db/schemas";
import { and, eq } from "drizzle-orm";
import { isEmpty } from "lodash";
import { db } from "@/db";
import redis from "@/constants/redis";
import { UpdateUserSchemaType, userDetailType } from "@/validator/user.validator";
import { transformPhoneNumber } from "@/utils/phone.formater.util";
const TOKEN_KEY_PREFIX = 'revoked:';

export async function getUser({ email }: { email: string; phone?: string; }) {
  const user = await db.query.users
    .findFirst({
      columns: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
      },
      with: {
        userRoles: {
          columns: {},
          with: {
            role: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        userKitchens: {
          columns: {
            kitchenId: true,
          }
        },
        drivers: {
          columns: {
            id: true,
            kitchenId: true
          }
        },
        userBeneficiaries: {
          columns: {
            beneficiaryId: true,
          }
        },
      },
      where: (users, { eq }) => eq(users.email, email.toLowerCase()),
    });

  return user ? user : null;
}
export async function createUser(data: CreateUserInput, userDetail: userDetailType, roleId: string) {
  return await db.transaction(async (tx) => {

    const passwordHashed = await bcryptHash(data.password);
    const phoneFormatted = await transformPhoneNumber(userDetail?.phoneNumber || "");

    const [user] = await tx
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        password: passwordHashed,
        isActive: data.isActive,
        // phone: phoneFormatted,
        createdBy: data?.createdBy || null,
        updatedBy: data?.createdBy || null,
        updatedAt: new Date()
      })
      .returning();

    await tx.insert(userDetails).values({
      userId: user.id,
      firstName: userDetail.firstName ?? "",
      lastName: userDetail.lastName ?? "",
      phoneNumber: phoneFormatted ?? "",
      address: userDetail.address ?? "",
      dateOfBirth: (new Date(userDetail?.dateOfBirth || "") ?? new Date()).toISOString().split("T")[0],
      createdBy: user.id,
      updatedAt: new Date(),
      updatedBy: user.id,
    }).returning();

    await tx.insert(userRoles).values({
      userId: user.id,
      roleId: roleId,
      createdBy: user.id,
      createdAt: new Date(),
      isDeleted: false,
    }).returning();

    const [details] = await tx
      .select()
      .from(userDetails)
      .where(eq(userDetails.userId, user.id));

    return { ...user, ...details };
  });
}

export async function updateUserAll(
  userId: string,
  data: UpdateUserSchemaType,
  userDetail: userDetailType,
  roleId: string
) {
  return await db.transaction(async (tx) => {

    const phoneFormatted = await transformPhoneNumber(
      userDetail?.phoneNumber || ""
    );

    let hashedPassword: string | undefined;
    if (data.password) {
      hashedPassword = await bcryptHash(data.password);
    }

    const [updatedUser] = await tx
      .update(users)
      .set({
        ...(data.email && { email: data.email.toLowerCase() }),
        // ...(hashedPassword && { password: hashedPassword }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await tx
      .update(userDetails)
      .set({
        ...(userDetail.firstName && { firstName: userDetail.firstName }),
        ...(userDetail.lastName && { lastName: userDetail.lastName }),
        ...(phoneFormatted && { phoneNumber: phoneFormatted }),
        ...(userDetail.address && { address: userDetail.address }),

        ...(userDetail.dateOfBirth && {
          dateOfBirth: new Date(userDetail.dateOfBirth)
            .toISOString()
            .split("T")[0],
        }),

        ...(userDetail.storageId && { storageId: userDetail.storageId }),
        ...(userDetail.imageURL && { imageURL: userDetail.imageURL }),
        updatedAt: new Date(),
      })
      .where(eq(userDetails.userId, userId));

    await tx.delete(userRoles).where(eq(userRoles.userId, userId as any));

    await tx
      .insert(userRoles)
      .values({
        userId: userId as any,
        roleId,
        createdAt: new Date(),
        isDeleted: false,
      });

    const [details] = await tx
      .select()
      .from(userDetails)
      .where(eq(userDetails.userId, userId));

    return {
      ...updatedUser,
      ...details,
    };
  });
}

// login
export async function saveRefreshToken(userId: string, token: string, expiresAt: number, ipAddress: string, deviceInfo: string) {
  const expiresAtMs = expiresAt * 1000;
  const now = new Date();
  const expiresAtDate = new Date(expiresAtMs);

  const ttlMilliseconds = expiresAtDate.getTime() - Date.now();
  const tokenKey = `${TOKEN_KEY_PREFIX}:${userId}`;

  const tokenData = {
    userId: userId,
    refreshTokenHash: token,
    type: 'refresh_token' as const,
    createdBy: userId,
    createdAt: now,
    expiresAt: expiresAtDate,
    ipAddress,
    deviceInfo,
  };

  const [insertedOrUpdated] = await db.insert(userSessions)
    .values({
      refreshTokenHash: tokenData.refreshTokenHash,
      expiresAt: tokenData.expiresAt,
      userId: tokenData.userId,
      deviceInfo: tokenData.deviceInfo,
      ipAddress: tokenData.ipAddress,
      createdBy: tokenData.userId,
    })
    .onConflictDoUpdate({
      target: [userSessions.userId, userSessions.deviceInfo],
      set: {
        refreshTokenHash: tokenData.refreshTokenHash,
        deviceInfo: tokenData.deviceInfo,
        ipAddress: tokenData.ipAddress,
        expiresAt: tokenData.expiresAt,
        revokedAt: new Date(),
        isDeleted: false,
      },
    })
    .returning();
  // const [insertedOrUpdated] = await db.insert(userTokens)
  //   .values(tokenData)
  //   .onConflictDoUpdate({
  //     target: [userTokens.userId, userTokens.type],
  //     set: {
  //       token: tokenData.token,
  //       expiresAt: tokenData.expiresAt,
  //       isDeleted: false,
  //     },
  //   })
  //   .returning();

  if (ttlMilliseconds > 0) {
    await redis.del(tokenKey);
  }

  return insertedOrUpdated;
}

export async function revokeTokenStatus(token: string, isDeleted: boolean) {
  const userTokenData = await db.select()
    .from(userSessions)
    .where(eq(userSessions.refreshTokenHash, token))
    .limit(1);

  if (isEmpty(userTokenData)) return null;

  const tokenRecord: typeof userSessions.$inferSelect = userTokenData[0];
  const { expiresAt } = tokenRecord;

  const updateResult = await db.update(userSessions)
    .set({
      isDeleted: isDeleted, revokedAt: new Date(),
    })
    .where(eq(userSessions.refreshTokenHash, token));

  const tokenKey = `${TOKEN_KEY_PREFIX}:${tokenRecord.userId}`;
  const ttlMilliseconds = expiresAt.getTime() - Date.now();

  if (isDeleted && ttlMilliseconds > 0) {
    await redis.set(
      tokenKey,
      'BLACKLISTED',
      "PX",
      ttlMilliseconds
    );
  } else if (!isDeleted) {
    await redis.del(tokenKey);
  }

  return updateResult;
}

export async function validateTokenStatus(token: string) {
  const userTokenData = await db.select()
    .from(userSessions)
    .where(eq(userSessions.refreshTokenHash, token))
    .limit(1);

  if (isEmpty(userTokenData)) {
    return null;
  }

  const tokenRecord = userTokenData[0];

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    console.log(`Token ${token} is expired.`);
    return null;
  }

  const blacklistKey = `${TOKEN_KEY_PREFIX}:${tokenRecord.userId}`;
  const blacklistStatus = await redis.get(blacklistKey);

  if (blacklistStatus === 'BLACKLISTED') {
    console.log(`Token ${token} found in blacklist.`);
    return null;
  }

  if (tokenRecord.isDeleted) {
    console.log(`Token ${token} already marked as deleted in DB.`);
    return null;
  }

  return tokenRecord;
}

export async function updateUser(id: string, data: { password: string, updated_by: string; }) {

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
    return null;
  }

  return { id: updatedUser.id };
}