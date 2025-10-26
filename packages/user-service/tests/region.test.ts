import axios, { AxiosRequestConfig } from "axios";
import { beforeAll, describe, expect, test } from "bun:test";
import { assert } from "console";

const BASE_URL = "http://localhost:3001/api/regions";

let provinceId: string = "";
let regencyId: string = "";
let districtId: string = "";

let token = "";

const getConfig = (contentType: string = "application/json"): AxiosRequestConfig => ({
  headers: {
    "Content-Type": contentType,
    Authorization: `Bearer ${token}`,
  },
});

describe("Region API Flow (Provinces, Regencies, Districts, Villages)", () => {

  beforeAll(async () => {
    const loginRes = await axios("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        username: "raihan.ardianata@gmail.com",
        password: "Password@1",
      },
    });
    token = loginRes.data.data.authorization.token;
    assert(token, "Authentication token is required for region tests.");
  });

  test("should get a list of provinces and save the first ID", async () => {
    const res = await axios.get(`${BASE_URL}/provinces`, getConfig());

    expect(res.status).toBe(200);
    expect(res.data.data).toBeInstanceOf(Array);
    expect(res.data.data.length).toBeGreaterThan(0);

    provinceId = res.data.data[0].id;
    expect(provinceId).toBeDefined();
  });

  test("should get regencies by province ID and save the first ID", async () => {
    if (!provinceId) throw new Error("provinceId is undefined");

    const url = `${BASE_URL}/regencies?province_id=${provinceId}`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    expect(res.data.data).toBeInstanceOf(Array);
    expect(res.data.data.length).toBeGreaterThan(0);

    regencyId = res.data.data[0].id;
    expect(regencyId).toBeDefined();
  });

  test("should return 400 if province_id query parameter is missing", async () => {
    try {
      await axios.get(`${BASE_URL}/regencies`, getConfig());
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('Missing required query parameter: province_id');
    }
  });

  test("should get districts by regency ID and save the first ID", async () => {
    if (!regencyId) throw new Error("regencyId is undefined");

    const url = `${BASE_URL}/districts?regency_id=${regencyId}`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    expect(res.data.data).toBeInstanceOf(Array);
    expect(res.data.data.length).toBeGreaterThan(0);

    districtId = res.data.data[0].id;
    expect(districtId).toBeDefined();
  });


  test("should get villages by district ID", async () => {
    if (!districtId) throw new Error("districtId is undefined");

    const url = `${BASE_URL}/villages?district_id=${districtId}`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    expect(res.data.data).toBeInstanceOf(Array);
    expect(res.data.data.length).toBeGreaterThan(0);
  });


  test("should return an empty array for a non-existent but valid UUID", async () => {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";

    const url = `${BASE_URL}/regencies?province_id=${fakeUuid}`;
    const res = await axios.get(url, getConfig());

    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([]);
  });
});