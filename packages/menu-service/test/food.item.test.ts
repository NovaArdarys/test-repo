import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3007/api";
const AUTH_URL = "http://localhost:3000/api/auth";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_fitem`;

describe("Food Items API (CRUD & Status)", () => {
  let token: string;
  let loggedInUserId: string;
  let createdFoodItemId: string;
  let createdMenuId: string;
  let createdMenuPlanId: string;

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
      method: "POST",
      ...getConfig(),
      data: {
        name: `Ayam Tepung ${UNIQUE_SUFFIX}`,
        type: "PROTEIN",
        description: "Ayam dibalut tepung",
        createdBy: loggedInUserId,
      },
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
      method: "POST",
      ...getConfig(),
      data: { foodItemId: createdFoodItemId, menuFoodPlanId: createdMenuPlanId },
    });
    createdMenuId = resMenu.data.data.id;
  });


  test("POST /food-items creates a new food item", async () => {
    const res = await axios(`${BASE_URL}/food-items`, {
      method: "POST",
      ...getConfig(),
      data: {
        name: `Ayam Tepung ${UNIQUE_SUFFIX}`,
        type: "PROTEIN",
        description: "Ayam dibalut tepung",
        createdBy: loggedInUserId,
      },
    });

    expect(res.status).toBe(201);
    createdFoodItemId = res.data.data.id;
  });

  test("GET /food-items returns a list", async () => {
    const res = await axios(`${BASE_URL}/food-items?name=${UNIQUE_SUFFIX}`, {
      method: "GET",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);
  });

  test("GET /food-items/:id returns the created item", async () => {
    const res = await axios(`${BASE_URL}/food-items/${createdFoodItemId}`, {
      method: "GET",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
    expect(res.data.data.id).toBe(createdFoodItemId);
  });

  test("PUT /food-items/:id updates the item name", async () => {
    const newName = `Nasi Goreng Updated ${UNIQUE_SUFFIX}`;
    const res = await axios(`${BASE_URL}/food-items/${createdFoodItemId}`, {
      method: "PUT",
      ...getConfig(),
      data: { name: newName, type: "CARBO", updatedBy: loggedInUserId },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.name).toBe(newName);
  });

  test("PATCH /food-items/:id/availability sets isAvailable to false", async () => {
    const res = await axios(`${BASE_URL}/food-items/${createdFoodItemId}/availability`, {
      method: "PATCH",
      ...getConfig(),
      data: { isAvailable: false },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.isAvailable).toBe(false);
  });

  test("POST /menu-plans/:id/food-items (Assign) and GET /food-items/:id/menus (List Relasi)", async () => {
    await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/food-items`, {
      method: "POST",
      ...getConfig(),
      data: { foodItemId: createdFoodItemId },
    });

    await axios(`${BASE_URL}/menu-plans/${createdMenuPlanId}/food-items`, {
      method: "POST",
      ...getConfig(),
      data: { foodItemId: createdFoodItemId },
    });

    const res = await axios(`${BASE_URL}/food-items/${createdMenuPlanId}/menus`, {
      method: "GET",
      ...getConfig(),
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
  });


  test("DELETE /food-items/:id soft deletes the food item", async () => {
    const res = await axios(`${BASE_URL}/food-items/${createdFoodItemId}`, {
      method: "DELETE",
      ...getConfig(),
    });
    expect(res.status).toBe(200);
  });
});