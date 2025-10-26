import axios, { AxiosRequestConfig } from "axios";
import { beforeAll, describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:3001";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Permissions API CRUD", () => {
  let token = "";
  let createdPermissionId: string | number = "";

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

  });


  test("GET /api/permissions: Should return a list of permissions with pagination", async () => {
    const url = `${BASE_URL}/api/permissions?page=1&limit=5&type=API`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    const data = res.data;

    expect(Array.isArray(data.data)).toBe(true);
    expect(data.meta).toBeDefined();
  });


  test("POST /api/permissions: Should create a new permission dynamically", async () => {
    const newPermission = {
      name: `Perm_${UNIQUE_SUFFIX}`,
      type: "API",
      resource: `/api/test_resource_${UNIQUE_SUFFIX}`,
      action: "read",
    };

    const res = await axios.post(`${BASE_URL}/api/permissions`, newPermission, getConfig());

    expect(res.status).toBe(201);
    const data = res.data.data;

    expect(data.name).toBe(newPermission.name);
    expect(data.id).toBeDefined();

    createdPermissionId = data.id;
  });

  test("GET /api/permissions/{id}: Should return the dynamically created permission", async () => {
    expect(createdPermissionId).toBeDefined();

    const res = await axios.get(`${BASE_URL}/api/permissions/${createdPermissionId}`, getConfig());

    expect(res.status).toBe(200);
    const data = res.data.data;
    expect(data.id).toBe(createdPermissionId);
    expect(data.resource).toContain(UNIQUE_SUFFIX);
  });


  test("PUT /api/permissions/{id}: Should update the dynamically created permission", async () => {
    expect(createdPermissionId).toBeDefined();
    const updatedAction = "update";

    const updateData = {
      action: updatedAction,
    };

    const res = await axios.put(`${BASE_URL}/api/permissions/${createdPermissionId}`, updateData, getConfig());
    expect(res.status).toBe(200);

    const verifyRes = await axios.get(`${BASE_URL}/api/permissions/${createdPermissionId}`, getConfig());
    expect(verifyRes.data.data.action).toBe(updatedAction);
  });

  test("DELETE /api/permissions/{id}: Should soft delete the created permission", async () => {
    expect(createdPermissionId).toBeDefined();
    const res = await axios.delete(`${BASE_URL}/api/permissions/${createdPermissionId}`, getConfig());
    expect(res.status).toBe(200);
  });

});
