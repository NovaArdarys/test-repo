import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3005/api";
const AUTH_URL = "http://localhost:3000/api/auth";
const BASE_MENU_URL = "http://localhost:3007/api";
const BASE_KITCHEN_URL = "http://localhost:3006/api";
const BASE_SCHOOL_URL = "http://localhost:3010/api";

const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

let createdDeliverySchoolRecordId: string;

describe("Delivery Schools API (Assignment & Status)", () => {

  let token: string;
  let driverTestUserId: string;
  let createdKitchenId: string;
  let createdDriverId: string;
  let createdDeliveryId: string;
  let createdMenuPlanId: string;
  let createdSchoolId: string;

  const today = new Date();
  const planStart = new Date(today); planStart.setDate(today.getDate() + 1);
  const planEnd = new Date(today); planEnd.setDate(today.getDate() + 2);

  beforeAll(async () => {
    const loginRes = await axios(`${AUTH_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        username: "raihan.ardianata@gmail.com",
        password: "Password@1",
      },
    });

    token = loginRes.data.data.authorization.token;

    const resKitchen = await axios(`${BASE_KITCHEN_URL}/kitchens`, {
      method: "POST",
      ...getConfig(),
      data: {
        name: `Dapur Test ${UNIQUE_SUFFIX}`,
        address: "Jl. Sudirman Kav. 52-53",
        phoneNumber: "081234567890",

        lon: -6.2146,
        lat: 106.8451,

        provinceId: "a0a0a0a0-0000-0000-0000-000000000001",
        regencyId: "b1b1b1b1-1111-1111-1111-111111111112",
        districtId: "c2c2c2c2-2222-2222-2222-222222222223",
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
      },
    });

    createdKitchenId = resKitchen.data.data.id;

    const email = `raihan.ardianata-test-${Date.now()}@gmail.com`; // biar unik setiap run
    const resUser = await axios(`${AUTH_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        email,
        password: "Password@1",
      },
    });
    driverTestUserId = resUser.data.data.id;

    const res = await axios(`${BASE_KITCHEN_URL}/drivers`, {
      method: "POST",
      ...getConfig(),
      data: {
        userId: driverTestUserId,
        kitchenId: createdKitchenId,
        licenseNumber: `L-${UNIQUE_SUFFIX}`,
      },
    });
    createdDriverId = res.data.data.id;

    const resDelivery = await axios(`${BASE_URL}/deliveries`, {
      method: "POST",
      ...getConfig(),
      data: {
        kitchenId: createdKitchenId,
        driverId: createdDriverId,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        estimatedDeliveryTime: new Date().toISOString(),
      }
    });
    createdDeliveryId = resDelivery.data.data.id;

    const resMenuPlan = await axios(`${BASE_MENU_URL}/menu-plans`, {
      method: "POST",
      ...getConfig(),
      data: {
        planStartDate: planStart.toISOString(),
        planEndDate: planEnd.toISOString(),
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
      },
    });

    createdMenuPlanId = resMenuPlan.data.data.id;

    const resSchool = await axios(`${BASE_SCHOOL_URL}/schools`, {
      method: "POST",
      ...getConfig(),
      data: {
        name: `Sekolah Test ${UNIQUE_SUFFIX}`,
        kitchenId: createdKitchenId,
        address: "Jl. Sekolah Dummy No. 5",
        lon: "-6.2146",
        lat: "106.8451",
        provinceId: "a0a0a0a0-0000-0000-0000-000000000001",
        regencyId: "b1b1b1b1-1111-1111-1111-111111111112",
        districtId: "c2c2c2c2-2222-2222-2222-222222222223",
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
      },
    });

    createdSchoolId = resSchool.data.data.id;
  });

  const getConfig = (): AxiosRequestConfig => ({
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
  });

  test("POST /deliveries/:id/schools: Assigns a School to the delivery trip", async () => {
    const res = await axios(`${BASE_URL}/deliveries/${createdDeliveryId}/schools`, {
      method: "POST",
      ...getConfig(),
      data: {
        schoolId: createdSchoolId,
        menuPlanId: createdMenuPlanId,
      }
    });
    expect(res.status).toBe(201);
    expect(res.data.data.schoolId).toBe(createdSchoolId);
    createdDeliverySchoolRecordId = res.data.data.id;
  });

  test("GET /deliveries/:id/schools: Lists assigned schools for the delivery", async () => {
    const res = await axios(`${BASE_URL}/deliveries/${createdDeliveryId}/schools`, { method: "GET", ...getConfig() });
    expect(res.status).toBe(200);
    expect(res.data.data.some((s: any) => s.school.id === createdSchoolId)).toBe(true);
  });

  test("PATCH /delivery-schools/:id/status: Marks the delivery to school as DELIVERED", async () => {
    const deliveredAt = new Date().toISOString();
    const res = await axios(`${BASE_URL}/delivery-schools/${createdDeliverySchoolRecordId}/status`, {
      method: "PATCH",
      ...getConfig(),
      data: { status: "DELIVERED", deliveredAt: deliveredAt }
    });
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("DELIVERED");
  });
});