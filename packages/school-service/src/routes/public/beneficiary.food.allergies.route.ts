import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { checkAccessToken } from "@/middleware/auth.middleware";
import { permission } from "@/middleware/permission.middleware";

import {
  CreateBeneficiaryFoodAllergySchema,
  UpdateBeneficiaryFoodAllergySchema,
  GetBeneficiaryFoodAllergyListSchema,
  BulkUpsertBeneficiaryAllergySchema,
} from "@/validator/beneficiary.food.allergies.validator";


import {
  listBeneficiaryFoodAllergiesHandler,
  getBeneficiaryFoodAllergyByIdHandler,
  createBeneficiaryFoodAllergyHandler,
  updateBeneficiaryFoodAllergyHandler,
  softDeleteBeneficiaryFoodAllergyHandler,
  bulkUpsertBeneficiaryFoodAllergiesHandler,
} from "@/controllers/public/beneficiary.food.allergies.controller";
import { idParamSchema } from "@/validator/global.validator";

const app = new Hono();

app.use(checkAccessToken);

app.get(
  "/",
  validate({ query: GetBeneficiaryFoodAllergyListSchema }),
  listBeneficiaryFoodAllergiesHandler
);

app.get(
  "/:id",
  validate({ param: idParamSchema }),
  getBeneficiaryFoodAllergyByIdHandler
);

app.post(
  "/",
  validate({ body: CreateBeneficiaryFoodAllergySchema }),
  createBeneficiaryFoodAllergyHandler
);

app.put(
  "/bulk",
  validate({ body: BulkUpsertBeneficiaryAllergySchema }),
  bulkUpsertBeneficiaryFoodAllergiesHandler
);

app.put(
  "/:id",
  validate({ param: idParamSchema, body: UpdateBeneficiaryFoodAllergySchema }),
  updateBeneficiaryFoodAllergyHandler
);

app.delete(
  "/:id",
  validate({ param: idParamSchema }),
  softDeleteBeneficiaryFoodAllergyHandler
);

export default app;
