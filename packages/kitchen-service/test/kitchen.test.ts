import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3006/api";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Kitchens API CRUD & Assignment", () => {
  let token = "";
  let testUserId = '78e3f082-f2fd-4d52-8361-e7c5708a516c';
  let activeKitchenId: string = "";

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


    expect(res.status).toBe(200);
    expect(res.data.data.authorization.token).toBeDefined();

    token = res.data.data.authorization.token;
  });

  test("POST /kitchens creates a new kitchen", async () => {
    const res = await axios(`${BASE_URL}/kitchens`, {
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

    expect(res.status).toBe(201);
    expect(res.data.data.id).toBeDefined();
    expect(res.data.data.name).toBe(`Dapur Test ${UNIQUE_SUFFIX}`);
    activeKitchenId = res.data.data.id;
  });

  test("GET /kitchens returns a list of kitchens with pagination", async () => {
    const res = await axios(`${BASE_URL}/kitchens?page=1&limit=5`, {
      method: "GET",
      ...getConfig(),
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.meta.page).toBe(1);
    expect(res.data.meta.limit).toBe(5);
  });

  test("GET /kitchens/:id returns the created kitchen", async () => {
    const res = await axios(`${BASE_URL}/kitchens/${activeKitchenId}`, {
      method: "GET",
      ...getConfig(),
    });

    expect(res.status).toBe(200);
    expect(res.data.data.id).toBe(activeKitchenId);
  });

  test("PUT /kitchens/:id updates the kitchen name", async () => {
    const newName = `Dapur Updated ${UNIQUE_SUFFIX}`;
    const res = await axios(`${BASE_URL}/kitchens/${activeKitchenId}`, {
      method: "PUT",
      ...getConfig(),
      data: {
        name: newName,
        lon: -6.2146,
        lat: 106.8451,

        provinceId: "a0a0a0a0-0000-0000-0000-000000000001",
        regencyId: "b1b1b1b1-1111-1111-1111-111111111112",
        districtId: "c2c2c2c2-2222-2222-2222-222222222223",
        villageId: "d3d3d3d3-3333-3333-3333-333333333334",
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.data.name).toBe(newName);
  });

  test("POST /kitchens/:id/users assigns a user to the kitchen", async () => {
    const res = await axios(`${BASE_URL}/kitchens/${activeKitchenId}/users`, {
      method: "POST",
      ...getConfig(),
      data: {
        userId: testUserId,
      },
    });

    expect(res.status).toBe(201);
    expect(res.data.message).toBe("User Assigned to Kitchen");
  });

  test("DELETE /kitchens/:id/users/:userId unassigns a user from the kitchen", async () => {
    const res = await axios(`${BASE_URL}/kitchens/${activeKitchenId}/users/${testUserId}`, {
      method: "DELETE",
      ...getConfig(),
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBe("User Unassigned from Kitchen");
  });

  test("DELETE /kitchens/:id soft deletes the kitchen", async () => {
    const res = await axios(`${BASE_URL}/kitchens/${activeKitchenId}`, {
      method: "DELETE",
      ...getConfig(),
    });

    expect(res.status).toBe(200);

    await expect(
      axios.get(`${BASE_URL}/kitchens/${activeKitchenId}`, getConfig())
    ).rejects.toThrow("Request failed with status code 404");
  });
});

