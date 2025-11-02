import { db } from "../index";
import { masterSteps } from "../schemas/stepPlan.schema";
import { eq } from "drizzle-orm";

// 🔹 Ambil tipe langsung dari schema
type EntityType = typeof masterSteps.$inferInsert.entityType;
type StepKey = typeof masterSteps.$inferInsert.stepKey;

console.log(process.env.DATABASE_URL, "--------DATABASE_URL--------");

const stepsByEntity: Record<
  any,
  { stepKey: StepKey; stepName: string; stepOrder: number; }[]
> = {
  kitchen: [
    { stepKey: "preparation", stepName: "Persiapan", stepOrder: 1 },
    { stepKey: "preparationTool", stepName: "APD", stepOrder: 2 },
    { stepKey: "cooking", stepName: "Dapur", stepOrder: 3 },
    { stepKey: "packaging", stepName: "Pemorsian", stepOrder: 4 },
  ],
  driver: [
    { stepKey: "delivery", stepName: "Pengantaran", stepOrder: 1 },
    { stepKey: "pickup", stepName: "Pengambilan", stepOrder: 2 },
  ],
  school: [
    { stepKey: "inspection", stepName: "Foto Murid", stepOrder: 1 },
    { stepKey: "receive", stepName: "Konfirmasi Penerimaan", stepOrder: 2 },
  ],
};

export async function seedMasterSteps() {
  console.log("🌱 Starting seeding for master steps...");

  await db.transaction(async (tx) => {
    for (const [entityType, steps] of Object.entries(stepsByEntity) as [
      EntityType,
      (typeof stepsByEntity)[EntityType]
    ][]) {
      const existing = await tx.query.masterSteps.findMany({
        where: eq(masterSteps.entityType, entityType),
      });

      if (existing.length === 0) {
        console.log(`🧩 Inserting ${steps.length} steps for "${entityType}"...`);
        await tx.insert(masterSteps).values(
          steps.map((s) => ({
            entityType,
            stepKey: s.stepKey,
            stepName: s.stepName,
            stepOrder: s.stepOrder,
          }))
        );
      } else {
        console.log(`✅ Steps for "${entityType}" already exist (${existing.length} records), skipping.`);
      }
    }
  });

  console.log("🎉 Master steps seeding complete!");
}

if (require.main === module) {
  seedMasterSteps()
    .then(() => {
      console.log("✅ Seed script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Error seeding master steps:", err);
      process.exit(1);
    });
}
