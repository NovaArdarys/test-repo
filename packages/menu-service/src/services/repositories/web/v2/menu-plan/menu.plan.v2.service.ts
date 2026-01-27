import createPlan from "./helpers/create/createPlan";
import attachFoodItems from "./helpers/attach/attachFoodItems";
import attachBeneficiaries from "./helpers/attach/attachBeneficiaries";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  beneficiaries as beneficiariesTable,
  menuPlans,
  sagaOrchestration,
  jobStatus,
  userBeneficiaries,
  kitchens,
  userKitchens
} from "@/db/schemas";
import { Beneficiary, Kitchen, MenuPlan } from "../types/domain";
import { CreateMenuPlanInput } from "../types";
import { publishMenuEvent } from "@/messaging/publishers/menu.publisher";
import { isEmpty } from "lodash";
import { processStatus } from "@/messaging/publishers/notification.publisher";

type BeneficiaryWithUsers = Beneficiary & {
  users: string[];
};
type KitchenWithUsers = Kitchen & {
  users: string[];
};

export async function createMenuPlan(
  data: CreateMenuPlanInput,
  kitchenId: string,
  foodItemsIds: string[] = [],
  dates: string[] = []
): Promise<{ menuPlans: MenuPlan[]; sagaId: string; }> {
  if (!kitchenId) {
    throw new Error("kitchenId is required");
  }

  const saga = await db.insert(sagaOrchestration).values({
    sagaType: 'CREATE_MENU_PLAN',
    status: 'STARTED',
    totalSteps: dates.length * 2, // 1 report + 1 delivery
    completedSteps: 0,
    failedSteps: 0,
    payload: {
      data,
      kitchenId,
      foodItemsIds,
      dates,
      requestedAt: new Date().toISOString(),
    }
  }).returning();

  const sagaId = saga[0].id;
  console.log(`[SAGA ${sagaId}] Started for ${dates.length} date(s)`);

  try {
    const result = await db.transaction(async trx => {
      const beneficiariesWithUsers = await trx
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
            eq(beneficiariesTable.kitchenId, kitchenId),
            eq(beneficiariesTable.status, "AKTIF"),
            eq(beneficiariesTable.isDeleted, false)
          )
        );

      const beneficiaries: BeneficiaryWithUsers[] = beneficiariesWithUsers.reduce((acc, row) => {
        const { userId, ...beneficiary } = row;

        const existing = acc.find(b => b.id === beneficiary.id);

        if (existing) {
          existing.users.push(userId);
        } else {
          acc.push({
            ...beneficiary,
            users: [userId],
          });
        }

        return acc;
      }, [] as BeneficiaryWithUsers[]);


      const kitchenWithUsers = await trx
        .select({
          id: kitchens.id,
          name: kitchens.name,
          address: kitchens.address,
          status: kitchens.status,
          joinDate: kitchens.joinDate,
          phoneNumber: kitchens.phoneNumber,
          lon: kitchens.lon,
          lat: kitchens.lat,
          provinceId: kitchens.provinceId,
          regencyId: kitchens.regencyId,
          districtId: kitchens.districtId,
          villageId: kitchens.villageId,
          storageId: kitchens.storageId,
          imageURL: kitchens.imageURL,
          isDeleted: kitchens.isDeleted,
          createdAt: kitchens.createdAt,
          createdBy: kitchens.createdBy,
          updatedAt: kitchens.updatedAt,
          updatedBy: kitchens.updatedBy,
          userId: userKitchens.userId,
        })
        .from(kitchens)
        .innerJoin(
          userKitchens,
          and(
            eq(userKitchens.kitchenId, kitchens.id),
            eq(userKitchens.isDeleted, false)
          )
        )
        .where(
          and(
            eq(kitchens.id, kitchenId),
            eq(kitchens.isDeleted, false)
          )
        );

      const kitchen: KitchenWithUsers | null = kitchenWithUsers.reduce((result, row) => {
        const { userId, ...kitchenData } = row;

        if (!result) {
          return {
            ...kitchenData,
            users: [userId],
          };
        }

        result.users.push(userId);
        return result;
      }, null as KitchenWithUsers | null);

      const createdPlans: MenuPlan[] = [];

      for (const dateStr of dates) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`[SAGA ${sagaId}] Invalid date skipped: ${dateStr}`);
          continue;
        }

        const exists = await trx.query.menuPlans.findFirst({
          where: and(
            eq(menuPlans.kitchenId, kitchenId),
            eq(menuPlans.planStartDate, dateStr)
          )
        });

        if (exists) {
          console.warn(`[SAGA ${sagaId}] Plan exists for ${dateStr}, skipping`);
          continue;
        }

        const plan: MenuPlan = await createPlan(trx, data, kitchenId, date);

        await attachFoodItems(trx, plan, foodItemsIds);
        await attachBeneficiaries(trx, plan, beneficiaries);

        createdPlans.push(plan);

        console.log(`[SAGA ${sagaId}] Plan created: ${plan.id} for ${dateStr}`);
      }

      return { menuPlans: createdPlans, beneficiaries, kitchen };
    });

    const { menuPlans: createdPlans, beneficiaries, kitchen } = result;

    if (isEmpty(createdPlans)) {
      console.warn(`[SAGA ${sagaId}] No menu plans created (all duplicates)`);

      await db.update(sagaOrchestration)
        .set({
          status: 'COMPLETED',
          completedSteps: 0,
          updatedAt: new Date(),
          completedAt: new Date(),
        })
        .where(eq(sagaOrchestration.id, sagaId));

      return { menuPlans: [], sagaId };
    }


    beneficiaries.forEach(({ name, users }) => {
      users.forEach((userId) => {
        processStatus.completed({
          status: "COMPLETED",
          entityType: "MENU_PLAN",
          entityId: createdPlans[0].id,
          kitchenId: kitchenId,
          beneficiaryId: undefined,
          relatedId: undefined,
          relatedType: undefined,
          jobId: sagaId,
          date: new Date().toISOString().split('T')[0],
          progress: 100,
          step: "Berhasil Membuat Menu",
          result: result,
          error: undefined,
          userActorId: createdPlans[0].createdBy,
          userReceivedId: userId,
          title: "Menu Plan Berhasil Dibuat",
          message: `Menu untuk ${name} tanggal ${createdPlans[0].planStartDate} telah selesai dibuat`,
          timestamp: new Date().toISOString(),
        });
      });
    });


    kitchen?.users.forEach((userId) => {
      processStatus.completed({
        status: "COMPLETED",
        entityType: "MENU_PLAN",
        entityId: createdPlans[0].id,
        kitchenId: kitchenId,
        beneficiaryId: undefined,
        relatedId: undefined,
        relatedType: undefined,
        jobId: sagaId,
        date: new Date().toISOString().split('T')[0],
        progress: 100,
        step: "Berhasil Membuat Menu",
        result: result,
        error: undefined,
        userActorId: createdPlans[0].createdBy,
        userReceivedId: userId,
        title: "Menu Plan Berhasil Dibuat",
        message: `Menu tanggal ${createdPlans[0].planStartDate} telah selesai dibuat`,
        timestamp: new Date().toISOString(),
      });
    });

    await db.update(sagaOrchestration)
      .set({
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      })
      .where(eq(sagaOrchestration.id, sagaId));

    console.log(`[SAGA ${sagaId}] ${createdPlans.length} menu plan(s) created`);

    for (const plan of createdPlans) {
      const reportJob = await db.insert(jobStatus).values({
        sagaId,
        sagaType: 'CREATE_MENU_PLAN',
        jobType: 'CREATE_REPORT',
        serviceName: 'report-service',
        status: 'PENDING',
        entityId: plan.id,
        entityType: 'menu_plan',
        payload: {
          menuPlanId: plan.id,
          kitchenId: plan.kitchenId,
          planStartDate: plan.planStartDate,
          beneficiaries: beneficiaries.map(b => ({
            id: b.id,
            name: b.name,
          })),
        },
        maxAttempts: 3,
      }).returning();

      const deliveryJob = await db.insert(jobStatus).values({
        sagaId,
        sagaType: 'CREATE_MENU_PLAN',
        jobType: 'CREATE_DELIVERY',
        serviceName: 'delivery-service',
        status: 'PENDING',
        entityId: plan.id,
        entityType: 'menu_plan',
        payload: {
          menuPlanId: plan.id,
          kitchenId: plan.kitchenId,
          planStartDate: plan.planStartDate,
          createdBy: plan.createdBy,
        },
        maxAttempts: 3,
      }).returning();

      console.log(`[SAGA ${sagaId}] Jobs created for plan ${plan.id}`);

      await publishMenuEvent("menu-plan.created", {
        sagaId,
        jobId: reportJob[0].id,
        menuPlanId: plan.id,
        kitchenId: plan.kitchenId!,
        planStartDate: plan.planStartDate,
        beneficiaries: beneficiaries.map(b => ({
          id: b.id,
          name: b.name,
        })),
        eventType: 'REPORT_CREATION',
        _meta: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        }
      });

      console.log(`[SAGA ${sagaId}] Report event published for plan ${plan.id}`);

      await publishMenuEvent("menu-plan.created", {
        sagaId,
        jobId: deliveryJob[0].id,
        menuPlanId: plan.id,
        kitchenId: plan.kitchenId!,
        planStartDate: plan.planStartDate,
        createdBy: plan.createdBy,
        eventType: 'DELIVERY_CREATION',
        _meta: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        }
      });

      console.log(`[SAGA ${sagaId}] Delivery event published for plan ${plan.id}`);
    }

    console.log(`[SAGA ${sagaId}] All events published successfully`);

    return { menuPlans: createdPlans, sagaId };

  } catch (error: any) {
    console.error(`[SAGA ${sagaId}] Error:`, error);

    await db.update(sagaOrchestration)
      .set({
        status: 'FAILED',
        failedSteps: 1,
        updatedAt: new Date(),
      })
      .where(eq(sagaOrchestration.id, sagaId));

    throw error;
  }
}