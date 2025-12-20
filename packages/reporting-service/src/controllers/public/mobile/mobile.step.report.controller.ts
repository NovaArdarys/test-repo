import { getAllDailyReports } from "@/services/repositories/mobile/step.report.service";
import { catchAsync } from "@/utils/catchAsync";
import { Context } from "hono";

const getAuditFields = (c: Context) => ({
  createdBy: c.get('userId'),
  updatedBy: c.get('userId'),
  userId: c.get('userId'),
  domain: c.get('domain'),
  subDomain: c.get('subDomain'),
  kitchenId: c.get("kitchenId") as string[],
  driverId: c.get("driverId") as string[],
  beneficiaryId: c.get("beneficiaryId") as string[],
  driverKitchenId: c.get("driverKitchenId") as string[],
  updatedAt: new Date(),
  createdAt: new Date(),
  isAppManager: c.get("isAppManager") as boolean,
});

export const listStepReportsHandler = catchAsync(async (c: Context) => {
  const query = await c.get("validatedData").query;

  const page = parseInt(String(query.page || "1"));
  const limit = parseInt(String(query.limit || "10"));
  const startDate = query.startDate;
  const endDate = query.endDate;
  const subDomain = query.subDomain;

  console.log(subDomain, "=====subDomain====");


  const { kitchenId } = getAuditFields(c);

  const reports = await getAllDailyReports({
    page,
    limit,
    kitchenIds: kitchenId ?? [],
    startDate,
    endDate,
    subDomain
  });

  return c.json(reports, 200);
});