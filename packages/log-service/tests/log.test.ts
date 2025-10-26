import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3003/api";
const AUTH_URL = "http://localhost:3000/api/auth";

describe("Log API (App & Token Logs Retrieval)", () => {
  let token: string;
  let loggedInUserId: string;
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
  });


  const getConfig = (): AxiosRequestConfig => ({
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });

  test("GET /logs/app: Returns a list of application activity logs", async () => {
    const res = await axios(`${BASE_URL}/logs/app?limit=5`, { method: "GET", ...getConfig() });

    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);
    expect(res.data.meta).toBeDefined();

    const firstLog = res.data.data[0];
    expect(firstLog.level).toBeDefined();
    expect(firstLog.message).toBeDefined();
  });

  test("GET /logs/app: Filters by userId", async () => {
    const res = await axios(`${BASE_URL}/logs/app?userId=${loggedInUserId}`, { method: "GET", ...getConfig() });

    expect(res.status).toBe(200);
    const allLogsMatch = res.data.data.every((log: any) => log.userId === loggedInUserId);
    expect(allLogsMatch).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /logs/app: Filters by level (INFO)", async () => {
    const res = await axios(`${BASE_URL}/logs/app?level=INFO&limit=10`, { method: "GET", ...getConfig() });

    expect(res.status).toBe(200);
    const allLogsMatch = res.data.data.every((log: any) => log.level === 'INFO');
    expect(allLogsMatch).toBe(true);
  });


  test("GET /logs/token: Returns a list of token/auth activity logs", async () => {
    const res = await axios(`${BASE_URL}/logs/token?limit=5`, { method: "GET", ...getConfig() });

    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeGreaterThan(0);

    const firstTokenLog = res.data.data[0];
    expect(firstTokenLog.eventType).toBeDefined();
    expect(typeof firstTokenLog.success).toBe('boolean');
  });

  test("GET /logs/token: Filters by success status (true)", async () => {
    const res = await axios(`${BASE_URL}/logs/token?success=true`, { method: "GET", ...getConfig() });

    expect(res.status).toBe(200);
    const allLogsMatch = res.data.data.every((log: any) => log.success === true);
    expect(allLogsMatch).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /logs/token: Filters by userId", async () => {
    const res = await axios(`${BASE_URL}/logs/token?userId=${loggedInUserId}`, { method: "GET", ...getConfig() });

    expect(res.status).toBe(200);
    const allLogsMatch = res.data.data.every((log: any) => log.userId === loggedInUserId);
    expect(allLogsMatch).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
  });
});