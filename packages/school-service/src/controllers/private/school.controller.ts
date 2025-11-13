import { syncSchoolsByMerge } from '@/services/repositories/beneficiary.service';
import ApiError from '@/utils/ApiError';
import { catchAsync } from '@/utils/catchAsync';
import { BulkUpdateBeneficiarySchemaType } from '@/validator/beneficiary.validator';
import { Context } from 'hono';

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date()
});


export const bulkUpdateSchoolHandler = catchAsync(async (c: Context) => {
  const body = await c.get("validatedData") as unknown as BulkUpdateBeneficiarySchemaType;
  const updatedSchools = await syncSchoolsByMerge({ kitchenId: body.kitchenId, schoolIds: body.data, updatedBy: body.userId, });

  return c.json({ data: updatedSchools, message: "Successfully updated schools" }, 200);
});