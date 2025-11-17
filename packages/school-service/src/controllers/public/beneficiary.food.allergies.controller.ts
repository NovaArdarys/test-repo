import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";

import {
  createBeneficiaryFoodAllergy,
  getBeneficiaryFoodAllergyById,
  getBeneficiaryFoodAllergies,
  updateBeneficiaryFoodAllergy,
  softDeleteBeneficiaryFoodAllergy,
  bulkUpsertBeneficiaryFoodAllergies
} from "@/services/repositories/beneficiary.food.allergies.service";

import {
  CreateBeneficiaryFoodAllergySchemaType,
  UpdateBeneficiaryFoodAllergySchemaType,
  GetBeneficiaryFoodAllergyListSchemaType,
  BulkUpsertBeneficiaryAllergySchemaType,
} from "@/validator/beneficiary.food.allergies.validator";

const getAuditFields = (c: Context) => ({
  createdBy: c.get("userId"),
  updatedBy: c.get("userId"),
  userId: c.get("userId"),
  updatedAt: new Date(),
  createdAt: new Date(),
});

export const listBeneficiaryFoodAllergiesHandler = catchAsync(async (c: Context) => {
  const query = await c.get("validatedData").query as unknown as GetBeneficiaryFoodAllergyListSchemaType;
  const page = parseInt(String(query.page || "1"));
  const limit = parseInt(String(query.limit || "10"));
  const beneficiaryId = query.beneficiaryId;

  const result = await getBeneficiaryFoodAllergies({ page, limit, beneficiaryId });

  return c.json({ data: result.data, meta: result.meta }, 200);
});

export const createBeneficiaryFoodAllergyHandler = catchAsync(async (c: Context) => {
  const body = await c.get("validatedData").body as CreateBeneficiaryFoodAllergySchemaType;
  const { createdBy } = getAuditFields(c);

  const newRecord = await createBeneficiaryFoodAllergy({
    ...body,
    createdBy,
  });

  return c.json({ data: newRecord, message: "Created" }, 201);
});


export const getBeneficiaryFoodAllergyByIdHandler = catchAsync(async (c: Context) => {
  const { id } = await c.get("validatedData").param;

  const data = await getBeneficiaryFoodAllergyById(id);

  return c.json({ data }, 200);
});


export const updateBeneficiaryFoodAllergyHandler = catchAsync(async (c: Context) => {
  const { id } = await c.get("validatedData").param;
  const body = await c.get("validatedData").body as UpdateBeneficiaryFoodAllergySchemaType;

  const updated = await updateBeneficiaryFoodAllergy(id, {
    ...body,
    updatedBy: c.get("userId"),
  });

  return c.json({ data: updated, message: "Updated" }, 200);
});


export const softDeleteBeneficiaryFoodAllergyHandler = catchAsync(async (c: Context) => {
  const { id } = await c.get("validatedData").param;

  const deleted = await softDeleteBeneficiaryFoodAllergy(id, c.get("userId"));

  return c.json({ data: deleted, message: "Soft-deleted" }, 200);
});


export const bulkUpsertBeneficiaryFoodAllergiesHandler = catchAsync(
  async (c: Context) => {
    const body =
      (await c.get("validatedData").body) as BulkUpsertBeneficiaryAllergySchemaType;

    const userId = c.get("userId");

    await bulkUpsertBeneficiaryFoodAllergies(
      body.beneficiaryId,
      body.items,
      userId
    );

    return c.json({ message: "Bulk upsert processed successfully" }, 200);
  }
);