// src/controllers/dashboard.controller.ts
import { Context } from "hono";
import { catchAsync } from "@/utils/catchAsync";
import { getDashboardData, RegionLevel } from "@/services/repositories/web/v1/summary/dashboard.service";
import { generateDashboardPdf } from "@/services/pdf/dashboard.pdf";

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
    regionLevel: query.regionLevel as RegionLevel ?? "district",
    page,
    limit,
    audit,
  });

  return c.json({ data });
});


export const getDashboardPdfHandler = catchAsync(async (c: Context) => {
  const query = c.req.query();
  const audit = getAuditFields(c);

  const data = await getDashboardData({
    startDate: query.startDate,
    endDate: query.endDate,
    provinceId: query.provinceId,
    regencyId: query.regencyId,
    districtId: query.districtId,
    villageId: query.villageId,
    status: query.status,
    regionLevel: (query.regionLevel as RegionLevel) ?? "district",
    page: 1,
    limit: 5,
    audit,
  });

  const pdfBuffer = await generateDashboardPdf(data);

  const uint8 = new Uint8Array(pdfBuffer);

  return c.body(uint8, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=dashboard-report.pdf",
  });
});