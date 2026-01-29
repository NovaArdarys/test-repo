import { db } from "../index";
import { masterSteps } from "../schemas/stepPlan.schema";
import { eq } from "drizzle-orm";

// 🔹 Ambil tipe langsung dari schema
type EntityType = typeof masterSteps.$inferInsert.entityType;
type StepKey = typeof masterSteps.$inferInsert.stepKey;
type AnalysisType = typeof masterSteps.$inferInsert.analysisType;

console.log(process.env.DATABASE_URL, "--------DATABASE_URL--------");

// 🔹 Definisikan tipe untuk step configuration
type StepConfig = {
  stepKey: StepKey;
  stepName: string;
  stepOrder: number;
  subDomains?: string[] | null;
  analysisType?: AnalysisType | null;
};

const stepsByEntity: Record<EntityType, StepConfig[]> = {
  kitchen: [
    {
      stepKey: "preparationTool",
      stepName: "APD",
      stepOrder: 1,
      subDomains: ["pemorsian", "persiapan", "memasak"],
      analysisType: "apd_check",
    },
    {
      stepKey: "inspection_before",
      stepName: "Kebersihan Sebelum",
      stepOrder: 2,
      subDomains: ["pemorsian", "persiapan", "memasak"],
      analysisType: "cleanliness",
    },
    {
      stepKey: "confirmation",
      stepName: "Foto Menu",
      stepOrder: 3,
      subDomains: ["pemorsian"],
      analysisType: "food_detection",
    },
    {
      stepKey: "inspection_after",
      stepName: "Kebersihan Sesudah",
      stepOrder: 4,
      subDomains: ["pemorsian", "persiapan", "memasak"],
      analysisType: "cleanliness",
    },
  ],
  driver: [
    {
      stepKey: "preparation",
      stepName: "Persiapan Pengantaran",
      stepOrder: 1,
      subDomains: [],
      analysisType: null,
    },
    {
      stepKey: "delivery",
      stepName: "Pengantaran",
      stepOrder: 2,
      subDomains: null,
      analysisType: null,
    },
    {
      stepKey: "pickup",
      stepName: "Pengambilan",
      stepOrder: 3,
      subDomains: null,
      analysisType: null,
    },
  ],
  beneficiary: [
    {
      stepKey: "inspection",
      stepName: "Penerimaan",
      stepOrder: 1,
      subDomains: null,
      analysisType: null,
    },
    {
      stepKey: "confirmation",
      stepName: "Foto Menu",
      stepOrder: 2,
      subDomains: null,
      analysisType: "food_detection",
    },
    {
      stepKey: "alergic",
      stepName: "Foto Menu Alergi",
      stepOrder: 3,
      subDomains: null,
      analysisType: "food_detection",
    },
  ],
  school: [],
  kitchen_daily_report: [],
  driver_daily_report: [],
  school_daily_report: [],
  beneficiary_daily_report: [],
  profile: [],
  profile_supplier: [],
  incident_report_kitchen: [],
  incident_report_driver: [],
  incident_report_school: [],
  incident_report_beneficiary: [],
  other: []
};

export async function seedMasterSteps() {
  console.log("🌱 Starting seeding for master steps...");

  await db.transaction(async (tx) => {
    for (const [entityType, steps] of Object.entries(stepsByEntity) as [
      EntityType,
      StepConfig[]
    ][]) {
      // Skip if no steps defined for this entity type
      if (steps.length === 0) {
        console.log(`⏭️  Skipping "${entityType}" (no steps defined)`);
        continue;
      }

      const existing = await tx.query.masterSteps.findMany({
        where: eq(masterSteps.entityType, entityType),
      });

      if (existing.length === 0) {
        console.log(
          `🧩 Inserting ${steps.length} steps for "${entityType}"...`
        );
        await tx.insert(masterSteps).values(
          steps.map((s) => ({
            entityType,
            stepKey: s.stepKey,
            stepName: s.stepName,
            stepOrder: s.stepOrder,
            subDomains: s.subDomains || null,
            analysisType: s.analysisType || null,
          }))
        );
      } else {
        console.log(
          `✅ Steps for "${entityType}" already exist (${existing.length} records), skipping.`
        );
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