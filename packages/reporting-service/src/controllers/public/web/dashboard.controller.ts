// src/controllers/dashboard.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { getDashboardData } from "@/services/repositories/web/v1/summary/dashboard.service";

const getAuditFields = (c: Context) => ({
  userId: c.get("userId"),
  kitchenId: c.get("kitchenId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverId: c.get("driverId") as string[],
  isAppManager: c.get("isAppManager") as boolean,
});

export const getDashboardHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const audit = getAuditFields(c);

  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");

  const data = await getDashboardData({
    startDate: query.startDate,
    endDate: query.endDate,
    provinceId: query.provinceId,
    regencyId: query.regencyId,
    districtId: query.districtId,
    villageId: query.villageId,
    status: query.status,
    page,
    limit,
    audit,
  });

  return c.json({ data });
});
