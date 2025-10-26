import axios, { AxiosRequestConfig } from "axios";
import { beforeAll, describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:3001";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Role API CRUD", () => {
  let token = "";
  let createdRoleId: string | number = "";

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


  test("GET /api/roles: Should return a list of roles with pagination", async () => {
    const url = `${BASE_URL}/api/roles?page=1&limit=5`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    const data = res.data;

    expect(Array.isArray(data.data)).toBe(true);
    expect(data.meta).toBeDefined();
  });

  test("POST /api/roles: Should create a new role dynamically", async () => {
    const newRole = {
      name: `Role_${UNIQUE_SUFFIX}`,
      description: `Test Role for ${UNIQUE_SUFFIX}`,
    };

    const res = await axios.post(`${BASE_URL}/api/roles`, newRole, getConfig());

    expect(res.status).toBe(201);
    const data = res.data.data;

    expect(data.name).toBe(newRole.name);
    expect(data.id).toBeDefined();

    createdRoleId = data.id;
  });

  test("GET /api/roles/{id}: Should return the dynamically created role", async () => {
    expect(createdRoleId).toBeDefined();

    const res = await axios.get(`${BASE_URL}/api/roles/${createdRoleId}`, getConfig());

    expect(res.status).toBe(200);
    const data = res.data.data;
    expect(data.id).toBe(createdRoleId);
  });

  test("PUT /api/roles/{id}: Should update the dynamically created role", async () => {
    expect(createdRoleId).toBeDefined();
    const updatedDescription = "Updated Description Test";

    const updateData = {
      description: updatedDescription,
    };

    const res = await axios.put(`${BASE_URL}/api/roles/${createdRoleId}`, updateData, getConfig());
    expect(res.status).toBe(200);

    const verifyRes = await axios.get(`${BASE_URL}/api/roles/${createdRoleId}`, getConfig());
    expect(verifyRes.data.data.description).toBe(updatedDescription);
  });

  test("DELETE /api/roles/{id}: Should soft delete the created role", async () => {
    expect(createdRoleId).toBeDefined();
    const res = await axios.delete(`${BASE_URL}/api/roles/${createdRoleId}`, getConfig());
    expect(res.status).toBe(200);
  });

});
