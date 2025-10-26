import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3007/api";
const AUTH_URL = "http://localhost:3000/api/auth";
const BASE_SCHOOL_URL = "http://localhost:3010/api";
const BASE_KITCHEN_URL = "http://localhost:3006/api";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_mplan`;

describe("Menu Plans API (CRUD, Relasi, Aksi)", () => {
  let token: string;
  let loggedInUserId: string;
  let createdMenuId: string;
  let createdFoodItemId: string;
  let createdMenuPlanId: string;
  let activeKitchenId: string;
  let createdSchoolId: string;

  const today = new Date();
  const planStart = new Date(today); planStart.setDate(today.getDate() + 1);
  const planEnd = new Date(today); planEnd.setDate(today.getDate() + 2);

  const getConfig = (contentType: string = "application/x-www-form-urlencoded"): AxiosRequestConfig => ({
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
    },
  });

  beforeAll(async () => {
    const loginRes = await axios(`${AUTH_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: { username: "raihan.ardianata@gmail.com", password: "Password@1" },
    });
    token = loginRes.data.data.authorization.token;
    loggedInUserId = loginRes.data.data.id;

    const resFoodItem = await axios(`${BASE_URL}/food-items`, {
      method: "POST", ...getConfig(),
      data: { name: `Ikan Bakar ${UNIQUE_SUFFIX}`, type: "PROTEIN", createdBy: loggedInUserId },
    });
    createdFoodItemId = resFoodItem.data.data.id;

    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const resPlan = await axios(`${BASE_URL}/menu-plans`, {
      method: "POST",
      ...getConfig(),
      data: {
        planStartDate: tomorrow.toISOString(),
        planEndDate: new Date(tomorrow.getTime() + 86400000).toISOString(),
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
        createdBy: loggedInUserId,
        status: "ACTIVE"
      },
    });
    createdMenuPlanId = resPlan.data.data.id;

    const resMenu = await axios(`${BASE_URL}/menus`, {
      method: "POST", ...getConfig(),
      data: { foodItemId: createdFoodItemId, menuFoodPlanId: createdMenuPlanId },
    });
    createdMenuId = resMenu.data.data.id;

    const resKitchen = await axios(`${BASE_KITCHEN_URL}/kitchens`, {
      method: "POST",
      ...getConfig(),
      data: {
        name: `Temp Kitchen School ${UNIQUE_SUFFIX}`,
        address: "Jl. Kitchen Prasyarat",
        kitchenId: "12345678-abcd-ef01-2345-67890abcdef0",
        phoneNumber: "081234567890",

        lon: -6.2146,
        lat: 106.8451,

        provinceId: "a0a0a0a0-0000-0000-0000-000000000001",
        regencyId: "b1b1b1b1-1111-1111-1111-111111111112",
        districtId: "c2c2c2c2-2222-2222-2222-222222222223",
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
      },
    });
    activeKitchenId = resKitchen.data.data.id;

    const resSchool = await axios(`${BASE_SCHOOL_URL}/schools`, {
      method: "POST",
      ...getConfig(),
      data: {
        name: `Sekolah Test ${UNIQUE_SUFFIX}`,
        kitchenId: activeKitchenId,
        address: "Jl. Sekolah Dummy No. 5",
        lon: "-6.2146",
        lat: "106.8451",
        provinceId: "a0a0a0a0-0000-0000-0000-000000000001",
        regencyId: "b1b1b1b1-1111-1111-1111-111111111112",
        districtId: "c2c2c2c2-2222-2222-2222-222222222223",
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
        createdBy: loggedInUserId,
      },
    });
    createdSchoolId = resSchool.data.data.id;

  });

  test("POST /menu-plans creates a new menu plan (DRAFT)", async () => {
    const res = await axios(`${BASE_URL}/menu-plans`, {
      method: "POST",
      ...getConfig(),
      data: {
        planStartDate: planStart.toISOString(),
        planEndDate: planEnd.toISOString(),
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
        createdBy: loggedInUserId,
      },
    });

    expect(res.status).toBe(201);
    createdMenuPlanId = res.data.data.id;
  });

  test("GET /menu-plans returns a list with status filter", async () => {
    const res = await axios(`${BASE_URL}/menu-plans?status=DRAFT`, {
      method: "GET",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);
  });

  test("PUT /menu-plans/:id updates the plan end date", async () => {
    const newEnd = new Date(planEnd.getTime() + 86400000).toISOString();
    const res = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}`, {
      method: "PUT",
      ...getConfig(),
      data: {
        planStartDate: planStart.toISOString(),
        planEndDate: newEnd,
        updatedBy: loggedInUserId
      },
    });

    expect(res.status).toBe(200);
    expect(newEnd).toInclude(res.data.data.planEndDate);
  });

  test("PATCH /menu-plans/:id/status changes status to APPROVED", async () => {
    const res = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/status`, {
      method: "PATCH",
      ...getConfig(),
      data: { status: "ACTIVE" },
    });

    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("ACTIVE");
  });

  test("POST /food-items (Assign) and GET /food-items (List)", async () => {
    await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/food-items`, {
      method: "POST",
      ...getConfig(),
      data: { foodItemId: createdFoodItemId },
    });

    const res = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/food-items`, {
      method: "GET", ...getConfig()
    });

    expect(res.status).toBe(200);
    expect(res.data.data.some((item: any) => item.id === createdFoodItemId)).toBe(true);

    const resDelete = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/food-items/${createdFoodItemId}`, {
      method: "DELETE", ...getConfig()
    });
    expect(resDelete.status).toBe(200);
  });

  test("POST /distribution (Assign) and GET /distribution (List)", async () => {
    await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/distribution`, {
      method: "POST",
      ...getConfig(),
      data: { schoolId: createdSchoolId, kitchenId: activeKitchenId },
    });

    const res = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/distribution`, {
      method: "GET", ...getConfig()
    });

    expect(res.status).toBe(200);
    expect(res.data.data.some((d: any) => d.school.id === createdSchoolId)).toBe(true);

    const resDelete = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/distribution?schoolId=${createdSchoolId}&kitchenId=${activeKitchenId}`, {
      method: "DELETE", ...getConfig()
    });
    expect(resDelete.status).toBe(200);
  });

  test("DELETE /menu-plans/:id soft deletes the plan", async () => {
    const res = await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}`, {
      method: "DELETE", ...getConfig()
    });
    expect(res.status).toBe(200);

    await axios(`${BASE_URL}/menus/${createdMenuId}`, { method: "DELETE", ...getConfig() });
    await axios(`${BASE_URL}/food-items/${createdFoodItemId}`, { method: "DELETE", ...getConfig() });
  });
});