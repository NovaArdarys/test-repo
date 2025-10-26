import { syncSchoolsByMerge } from '@/services/repositories/school.service';
import ApiError from '@/utils/ApiError';
import { catchAsync } from '@/utils/catchAsync';
import { BulkUpdateSchoolSchemaType } from '@/validator/school.validator';
import { Context } from 'hono';

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId') as string,
  updatedBy: c.get('userId') as string,
  updatedAt: new Date(),
  createdAt: new Date()
});

export const bulkUpdateSchoolHandler = catchAsync(async (c: Context) => {
  const body = await c.get("validatedData") as unknown as BulkUpdateSchoolSchemaType;
  const updatedSchools = await syncSchoolsByMerge({ kitchenId: body.kitchenId, schoolIds: body.data, updatedBy: body.userId, });

  return c.json({ data: updatedSchools, message: "Successfully updated schools" }, 200);
});