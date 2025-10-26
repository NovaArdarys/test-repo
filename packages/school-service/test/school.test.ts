import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3010/api";
const BASE_KITCHEN_URL = "http://localhost:3006/api";
const AUTH_URL = "http://localhost:3000/api/auth";
const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Schools API CRUD & Assignment", () => {
  let staffTestUserId: string;
  let activeKitchenId: string;
  let createdSchoolId: string;
  let token: string;
  let loggedInUserId: string;

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

    const staffEmail = `staff-${UNIQUE_SUFFIX}@testmail.com`;
    const resUser = await axios(`${AUTH_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        email: staffEmail,
        password: "Password@1",
      },
    });
    staffTestUserId = resUser.data.data.id;

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
  });

  test("POST /schools creates a new school", async () => {
    const res = await axios(`${BASE_URL}/schools`, {
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

    expect(res.status).toBe(201);
    expect(res.data.data.id).toBeDefined();
    createdSchoolId = res.data.data.id;
  });

  // test("GET /schools returns a list of schools with pagination", async () => {
  //   const res = await axios(`${BASE_URL}/schools?page=1&limit=5&kitchenId=${activeKitchenId}`, {
  //     method: "GET",
  //     ...getConfig(),
  //   });

  //   expect(res.status).toBe(200);
  //   expect(res.data.data).toBeInstanceOf(Array);
  //   expect(res.data.meta.page).toBe(1);
  // });

  // test("GET /schools/:id returns the created school", async () => {
  //   const res = await axios(`${BASE_URL}/schools/${createdSchoolId}`, {
  //     method: "GET",
  //     ...getConfig(),
  //   });

  //   expect(res.status).toBe(200);
  //   expect(res.data.data.id).toBe(createdSchoolId);
  // });

  // test("PUT /schools/:id updates the school address", async () => {
  //   const newAddress = `Jl. Updated School ${UNIQUE_SUFFIX}`;
  //   const res = await axios(`${BASE_URL}/schools/${createdSchoolId}`, {
  //     method: "PUT",
  //     ...getConfig(),
  //     data: {
  //       name: `Sekolah Test ${UNIQUE_SUFFIX}`,
  //       kitchenId: activeKitchenId,
  //       address: `Jl. Updated School ${UNIQUE_SUFFIX}`,
  //       lon: "-6.2146",
  //       lat: "106.8451",
  //       provinceId: "a0a0a0a0-0000-0000-0000-000000000001",
  //       regencyId: "b1b1b1b1-1111-1111-1111-111111111112",
  //       districtId: "c2c2c2c2-2222-2222-2222-222222222223",
  //       villageId: "d3d3d3d3-3333-3333-3333-333333333334",
  //       createdBy: loggedInUserId,
  //     },
  //   });

  //   expect(res.status).toBe(200);
  //   expect(res.data.data.address).toBe(newAddress);
  // });

  // test("POST /schools/:id/users assigns a staff user to the school", async () => {
  //   const res = await axios(`${BASE_URL}/schools/${createdSchoolId}/users`, {
  //     method: "POST",
  //     ...getConfig(),
  //     data: {
  //       userId: staffTestUserId,
  //       createdBy: loggedInUserId,
  //     },
  //   });

  //   expect(res.status).toBe(201);
  //   expect(res.data.message).toBe("User Assigned To School");
  // });

  // test("DELETE /schools/:id/users/:userId unassigns the user from the school", async () => {
  //   const res = await axios(`${BASE_URL}/schools/${createdSchoolId}/users/${staffTestUserId}`, {
  //     method: "DELETE",
  //     ...getConfig(),
  //   });

  //   expect(res.status).toBe(200);
  //   expect(res.data.message).toBe("User Unassigned From School");
  // });


  // test("DELETE /schools/:id soft deletes the school", async () => {
  //   const res = await axios(`${BASE_URL}/schools/${createdSchoolId}`, {
  //     method: "DELETE",
  //     ...getConfig(),
  //   });

  //   expect(res.status).toBe(200);

  //   await expect(
  //     axios.get(`${BASE_URL}/schools/${createdSchoolId}`, getConfig())
  //   ).rejects.toThrow();
  // });

});