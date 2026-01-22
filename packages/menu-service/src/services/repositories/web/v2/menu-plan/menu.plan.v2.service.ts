import createPlan from "./helpers/create/createPlan";
import attachFoodItems from "./helpers/attach/attachFoodItems";
import attachBeneficiaries from "./helpers/attach/attachBeneficiaries";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  beneficiaries as beneficiariesTable,
  menuPlans,
  sagaOrchestration,
  jobStatus
} from "@/db/schemas";
import { Beneficiary, MenuPlan } from "../types/domain";
import { CreateMenuPlanInput } from "../types";
import { publishMenuEvent } from "@/messaging/publishers/menu.publisher";
import { isEmpty } from "lodash";

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
      const beneficiaries: Beneficiary[] = await trx
        .select()
        .from(beneficiariesTable)
        .where(
          and(
            eq(beneficiariesTable.kitchenId, kitchenId),
            eq(beneficiariesTable.status, "AKTIF")
          )
        );

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

      return { menuPlans: createdPlans, beneficiaries };
    });

    const { menuPlans: createdPlans, beneficiaries } = result;

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