import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3007/api";
const AUTH_URL = "http://localhost:3000/api/auth";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_menu`;

describe("Menus API (CRUD & Relasi)", () => {
  let token: string;
  let loggedInUserId: string;
  let createdMenuId: string;
  let createdMenuPlanId: string;
  let createdFoodItemId: string;

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
      data: {
        username: "raihan.ardianata@gmail.com",
        password: "Password@1",
      },
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
  });

  test("POST /menus creates a new menu", async () => {
    const res = await axios(`${BASE_URL}/menus`, {
      method: "POST",
      ...getConfig(),
      data: { foodItemId: createdFoodItemId, menuFoodPlanId: createdMenuPlanId }
    });

    expect(res.status).toBe(201);
    createdMenuId = res.data.data.id;
  });

  test("GET /menus returns a list", async () => {
    const res = await axios(`${BASE_URL}/menus`, {
      method: "GET",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);
  });

  test("GET /menus/:id returns the created menu", async () => {
    const res = await axios(`${BASE_URL}/menus/${createdMenuId}`, {
      method: "GET",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.id).toBe(createdMenuId);
  });

  test("PUT /menus/:id updates the description", async () => {
    const res = await axios(`${BASE_URL}/menus/${createdMenuId}`, {
      method: "PUT",
      ...getConfig(),
      data: { foodItemId: createdFoodItemId, menuFoodPlanId: createdMenuPlanId }
    });

    expect(res.status).toBe(200);
    expect(res.data.data.foodItemId).toBe(createdFoodItemId);
  });

  test("DELETE /menu-plans/:id (Hapus relasi Menu Plan)", async () => {
    await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}`, { method: "DELETE", ...getConfig() });
  });

  test("DELETE /menus/:id soft deletes the menu", async () => {
    const res = await axios(`${BASE_URL}/menus/${createdMenuId}`, {
      method: "DELETE",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
  });
});