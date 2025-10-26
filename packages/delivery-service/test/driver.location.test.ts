import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3005/api";
const AUTH_URL = "http://localhost:3000/api/auth";
const BASE_KITCHEN_URL = "http://localhost:3006/api";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Driver Locations API (Tracking)", () => {

  let token: string;
  let driverTestUserId: string;
  let createdKitchenId: string;
  let createdDriverId: string;
  let createdDeliveryId: string;

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
  });

  const getConfig = (): AxiosRequestConfig => ({
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
  });


  // test("POST /driver-locations: Records driver's location (Tracking)", async () => {
  //   const res = await axios(`${BASE_URL}/driver-locations`, {
  //     method: "POST",
  //     ...getConfig(),
  //     data: {
  //       driverId: createdDriverId,
  //       deliveryId: createdDeliveryId,
  //       lon: "106.8271",
  //       lat: "-6.1751",
  //       createdBy: loggedInUserId
  //     }
  //   });
  //   expect(res.status).toBe(201);
  // });

  // test("GET /deliveries/:id/locations: Lists the driver's location history", async () => {
  //   const res = await axios(`${BASE_URL}/deliveries/${createdDeliveryId}/locations`, { method: "GET", ...getConfig() });
  //   expect(res.status).toBe(200);
  //   expect(res.data.data.length).toBeGreaterThanOrEqual(1);
  // });

  test("FINAL: PATCH /deliveries/:id/status: Updates status to DELIVERED (Trip completed)", async () => {
    const res = await axios(`${BASE_URL}/deliveries/${createdDeliveryId}/status`, {
      method: "PATCH",
      ...getConfig(),
      data: { status: "DELIVERED" }
    });
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe("DELIVERED");
  });

  test("FINAL: DELETE /deliveries/:id: Soft deletes the delivery trip", async () => {
    const res = await axios(`${BASE_URL}/deliveries/${createdDeliveryId}`, { method: "DELETE", ...getConfig() });
    expect(res.status).toBe(200);
  });
});