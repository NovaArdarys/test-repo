import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3006/api";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Drivers API CRUD", () => {
  let driverTestUserId: string;
  let activeKitchenId: string;
  let createdDriverId: string;
  let token: string;

  const getConfig = (contentType: string = "application/x-www-form-urlencoded"): AxiosRequestConfig => ({
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
    },
  });

  beforeAll(async () => {
    const res = await axios("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        username: "raihan.ardianata@gmail.com",
        password: "Password@1",
      },
    });
    token = res.data.data.authorization.token;

    const email = `raihan.ardianata-test-${Date.now()}@gmail.com`; // biar unik setiap run
    const resUser = await axios("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        email,
        password: "Password@1",
      },
    });
    driverTestUserId = resUser.data.data.id;


    const resKitchen = await axios(`${BASE_URL}/kitchens`, {
      method: "POST",
      ...getConfig(),
      data: {
        name: `Temp Kitchen ${UNIQUE_SUFFIX}`,
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
    activeKitchenId = resKitchen.data.data.id;
  });

  test("POST /drivers assigns a user as a new driver", async () => {
    const res = await axios(`${BASE_URL}/drivers`, {
      method: "POST",
      ...getConfig(),
      data: {
        userId: driverTestUserId,
        kitchenId: activeKitchenId,
        licenseNumber: `L-${UNIQUE_SUFFIX}`,
      },
    });

    expect(res.status).toBe(201);
    expect(res.data.data.id).toBeDefined();


    createdDriverId = res.data.data.id;
  });

  test("GET /drivers returns a list of active drivers", async () => {
    const res = await axios(`${BASE_URL}/drivers?page=1&limit=10&is_active=true`, {
      method: "GET",
      ...getConfig(),
    });

    expect(res.status).toBe(200);
    expect(res.data.data).toBeInstanceOf(Array);
    expect(res.data.meta.total).toBeDefined();
  });

  test("GET /drivers/:id returns the created driver", async () => {
    const res = await axios(`${BASE_URL}/drivers/${createdDriverId}`, {
      method: "GET",
      ...getConfig(),
    });

    expect(res.status).toBe(200);
    expect(res.data.data.id).toBe(createdDriverId);
  });

  test("PUT /drivers/:id deactivates the driver", async () => {
    const res = await axios(`${BASE_URL}/drivers/${createdDriverId}`, {
      method: "PUT",
      ...getConfig(),
      data: {
        isActive: false,
        userId: driverTestUserId,
        kitchenId: activeKitchenId,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.data.isActive).toBe(false);
  });

  test("DELETE /drivers/:id soft deletes the driver", async () => {
    const res = await axios(`${BASE_URL}/drivers/${createdDriverId}`, {
      method: "DELETE",
      ...getConfig(),
    });

    expect(res.status).toBe(200);

    await expect(
      axios.get(`${BASE_URL}/drivers/${createdDriverId}`, getConfig())
    ).rejects.toThrow("Request failed with status code 404");
  });
});