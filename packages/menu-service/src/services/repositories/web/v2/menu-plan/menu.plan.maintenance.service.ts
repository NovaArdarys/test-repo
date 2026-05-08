import { db } from "@/db";
import { and, eq, inArray, lt, or, isNull, sql } from "drizzle-orm";
import {
  beneficiaries as beneficiariesTable,
  menuPlans,
  jobStatus,
  userBeneficiaries
} from "@/db/schemas";
import { publishMenuEvent } from "@/messaging/publishers/menu.publisher";
import attachBeneficiaries from "./helpers/attach/attachBeneficiaries";

/**
 * 1. Retry failed or stuck jobs from the saga
 */
export async function retryFailedMenuJobs() {
  // Find jobs that are FAILED, or PENDING for more than 1 hour (stuck)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const stuckJobs = await db.select().from(jobStatus).where(
    // or() is not imported, let's just do FAILED for now, or just import or
    eq(jobStatus.status, 'FAILED')
  );

  const stuckPendingJobs = await db.select().from(jobStatus).where(
    and(
      eq(jobStatus.status, 'PENDING'),
      lt(jobStatus.createdAt, oneHourAgo)
    )
  );

  const jobsToRetry = [...stuckJobs, ...stuckPendingJobs];
  const retriedJobIds: string[] = [];

  for (const job of jobsToRetry) {
    if (job.jobType === 'CREATE_REPORT') {
      const payload = job.payload as any;
      await publishMenuEvent("menu-plan.created", {
        sagaId: job.sagaId,
        jobId: job.id,
        eventType: "REPORT_CREATION",
        menuPlanId: job.entityId!,
        kitchenId: payload.kitchenId,
        planStartDate: payload.planStartDate,
        beneficiaries: payload.beneficiaries || [],
        createdBy: payload.createdBy || job.sagaId,
        _meta: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        }
      });
      retriedJobIds.push(job.id);

      await db.update(jobStatus).set({ status: 'PENDING', attemptCount: 0 }).where(eq(jobStatus.id, job.id));

    } else if (job.jobType === 'CREATE_DELIVERY') {
      const payload = job.payload as any;
      await publishMenuEvent("menu-plan.created", {
        sagaId: job.sagaId,
        jobId: job.id,
        eventType: "DELIVERY_CREATION",
        menuPlanId: job.entityId!,
        kitchenId: payload.kitchenId,
        planStartDate: payload.planStartDate,
        createdBy: payload.createdBy || job.sagaId,
        _meta: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        }
      });
      retriedJobIds.push(job.id);
      await db.update(jobStatus).set({ status: 'PENDING', attemptCount: 0 }).where(eq(jobStatus.id, job.id));
    }
  }

  return {
    message: `Retried ${retriedJobIds.length} failed/stuck jobs.`,
    jobIds: retriedJobIds,
  };
}

/**
 * 2. Fix broken menu plans (missing beneficiaries due to old bugs)
 */
export async function fixBrokenMenuPlans() {
  // Find all menu plans
  const allPlans = await db.select().from(menuPlans);

  let fixedCount = 0;

  for (const plan of allPlans) {
    if (!plan.kitchenId) continue;

    // Check if it has beneficiaryPortions
    const portions = await db.query.beneficiaryPortions.findMany({
      where: eq(require('@/db/schemas').beneficiaryPortions.menuPlanId, plan.id)
    });

    // If it has 0 beneficiaries, it is broken
    if (portions.length === 0) {
      // Find active beneficiaries for this kitchen
      const beneficiariesWithUsers = await db
        .select({
          id: beneficiariesTable.id,
          name: beneficiariesTable.name,
          kitchenId: beneficiariesTable.kitchenId,
          address: beneficiariesTable.address,
          category: beneficiariesTable.category,
          phoneNumber: beneficiariesTable.phoneNumber,
          lon: beneficiariesTable.lon,
          lat: beneficiariesTable.lat,
          provinceId: beneficiariesTable.provinceId,
          regencyId: beneficiariesTable.regencyId,
          districtId: beneficiariesTable.districtId,
          villageId: beneficiariesTable.villageId,
          storageId: beneficiariesTable.storageId,
          imageUrl: beneficiariesTable.imageUrl,
          isDeleted: beneficiariesTable.isDeleted,
          joinedDate: beneficiariesTable.joinedDate,
          smallPortion: beneficiariesTable.smallPortion,
          largePortion: beneficiariesTable.largePortion,
          smallDeliveryTime: beneficiariesTable.smallDeliveryTime,
          largeDeliveryTime: beneficiariesTable.largeDeliveryTime,
          status: beneficiariesTable.status,
          createdAt: beneficiariesTable.createdAt,
          createdBy: beneficiariesTable.createdBy,
          updatedAt: beneficiariesTable.updatedAt,
          updatedBy: beneficiariesTable.updatedBy,
          userId: userBeneficiaries.userId,
        })
        .from(beneficiariesTable)
        .innerJoin(
          userBeneficiaries,
          and(
            eq(userBeneficiaries.beneficiaryId, beneficiariesTable.id),
            eq(userBeneficiaries.isDeleted, false)
          )
        )
        .where(
          and(
            eq(beneficiariesTable.kitchenId, plan.kitchenId),
            or(eq(beneficiariesTable.isDeleted, false), isNull(beneficiariesTable.isDeleted)),
            or(
              eq(sql`LOWER(${beneficiariesTable.status}::text)`, 'active'),
              eq(sql`LOWER(${beneficiariesTable.status}::text)`, 'aktif'),
              isNull(beneficiariesTable.status)
            )
          )
        );

      const beneficiariesFormatted = beneficiariesWithUsers.reduce((acc, row) => {
        const { userId, ...beneficiary } = row;
        const existing = acc.find((b: any) => b.id === beneficiary.id);
        if (existing) {
          existing.users.push(userId);
        } else {
          acc.push({ ...beneficiary, users: [userId] });
        }
        return acc;
      }, [] as any[]);

      if (beneficiariesFormatted.length > 0) {
        await db.transaction(async (trx) => {
          await attachBeneficiaries(trx, plan as any, beneficiariesFormatted);
        });
        fixedCount++;
      }
    }
  }

  return {
    message: `Fixed ${fixedCount} broken menu plans by reattaching missing beneficiaries.`,
    fixedCount,
  };
}
