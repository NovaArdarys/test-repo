import axios, { AxiosRequestConfig } from "axios";
import { describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:3001";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;


describe("User API CRUD", () => {

  let token = "";
  let createdUserId: string | number = "";

  const getConfig = (contentType: string = "application/x-www-form-urlencoded"): AxiosRequestConfig => ({
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
    },
  });

  test("POST /api/auth/login returns token", async () => {
    const res = await axios("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        username: "raihan.ardianata@gmail.com",
        password: "Password@1",
      },
    });

    expect(res.status).toBe(200);
    const data = res.data.data;

    expect(data.email).toBe("raihan.ardianata@gmail.com");
    expect(data.authorization.token).toBeDefined();
    expect(data.authorization.refreshToken).toBeDefined();

    token = data.authorization.token;
  });

  test("GET /api/users: Should return a list of users with pagination", async () => {
    const url = `${BASE_URL}/api/users?page=1&limit=5&is_active=true`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    const data = res.data;

    expect(Array.isArray(data.data)).toBe(true);
    expect(data.meta).toBeDefined();
    expect(data.data.length).toBeLessThanOrEqual(5);
  });

  test("POST /api/users: Should create a new user dynamically", async () => {
    const newUser = {
      email: `testuser_${UNIQUE_SUFFIX}@example.com`,
      password: "TestPassword123",
      role_id: 2,
    };

    const res = await axios.post(`${BASE_URL}/api/users`, newUser, getConfig());

    expect(res.status).toBe(201);
    const data = res.data.data;

    expect(data.email).toBe(newUser.email);
    expect(data.id).toBeDefined();

    createdUserId = data.id;
  });


  test("GET /api/users/{id}: Should return the dynamically created user", async () => {
    expect(createdUserId).toBeDefined();

    const res = await axios.get(`${BASE_URL}/api/users/${createdUserId}`, getConfig());

    expect(res.status).toBe(200);
    const data = res.data.data;

    expect(data.id).toBe(createdUserId);
    expect(data.email).toContain(UNIQUE_SUFFIX);
  });

  test("PUT /api/users/{id}: Should update the user's status", async () => {
    expect(createdUserId).toBeDefined();
    const updatedUserData = {
      isActive: false,
    };

    const res = await axios.put(`${BASE_URL}/api/users/${createdUserId}`, updatedUserData, getConfig());

    expect(res.status).toBe(200);

    const verifyRes = await axios.get(`${BASE_URL}/api/users/${createdUserId}`, getConfig());
    expect(verifyRes.data.data.isActive).toBe(false);
  });

  test("PUT /api/users/{id}/details: Should update user details", async () => {
    expect(createdUserId).toBeDefined();
    const updatedDetails = {
      address: `New Address for ${UNIQUE_SUFFIX}`,
    };


    const res = await axios.put(`${BASE_URL}/api/users/${createdUserId}/details`, updatedDetails, getConfig());

    expect(res.status).toBe(200);
    const data = res.data.data;

    expect(data.id).toBe(createdUserId);

    const verifyRes = await axios.get(`${BASE_URL}/api/users/${createdUserId}/details`, getConfig());

    expect(verifyRes.data.data.address).toBe(updatedDetails.address);
  });

  test("DELETE /api/users/{id}: Should soft delete the user", async () => {
    expect(createdUserId).toBeDefined();

    const res = await axios.delete(`${BASE_URL}/api/users/${createdUserId}`, getConfig());

    expect(res.status).toBe(200);
    expect(res.data.message).toBe("User soft deleted successfully");

    await expect(
      axios.get(`${BASE_URL}/api/users/${createdUserId}`, getConfig())
    ).rejects.toThrow('Request failed with status code 404');
  });
});