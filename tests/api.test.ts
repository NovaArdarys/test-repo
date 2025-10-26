import axios from "axios";
import { describe, expect, test } from "bun:test";

type apiConfigurationType = "developmentServer" | "localhostServer";

const defaultApiUrl: Record<apiConfigurationType, any> = {
  developmentServer: {
    baseURL: "http://159.223.41.229",
    3000: "/auth",
    3001: "/user",
    3002: "/ws",
    3003: "/log",
    3004: "/ai",
    3005: "/delivery",
    3006: "/kitchen",
    3007: "/menu",
    3008: "/notification",
    3009: "/reporting",
    3010: "/school",
  },
  localhostServer: {
    baseURL: "http://localhost",
    3000: ":3000",
    3001: ":3001",
    3002: ":3002",
    3003: ":3003",
    3004: ":3004",
    3005: ":3005",
    3006: ":3006",
    3007: ":3007",
    3008: ":3008",
    3009: ":3009",
    3010: ":3010",
  },
};

const mode: apiConfigurationType = "localhostServer";

describe("Health check API", () => {

  test("GET /api/health returns running status and connection details Service Auth Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3000]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Auth Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details User Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3001]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("User Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Tracking Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3002]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Tracking Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Log Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3003]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Log Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details AI Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3004]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("AI Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Delivery Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3005]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Delivery Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Kitchen Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3006]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Kitchen Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Menu Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3007]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Menu Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Notification Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3008]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Notification Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details Reporting Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3009]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("Reporting Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

  test("GET /api/health returns running status and connection details School Service", async () => {
    const res = await axios(`${defaultApiUrl[mode].baseURL}${defaultApiUrl[mode][3010]}/api/health`, {
      method: "GET",
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.status).toBe("Running");

    expect(data.service).toBe("School Service");

    expect(data.database).toBeDefined();
    expect(data.database.status).toBe("Connected");

    expect(data.broker).toBeDefined();
    expect(data.broker.status).toBe("Connected");
  });

});