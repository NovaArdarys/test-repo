import axios, { AxiosRequestConfig } from "axios";
import { expect, test, describe, beforeAll } from "bun:test";

const BASE_URL = "http://localhost:3009/api/daily-reports";
const AUTH_URL = "http://localhost:3000/api/auth";

const UNIQUE_SUFFIX = `${Math.random().toString(36).substring(2, 8)}_test`;

describe("Daily Reports API CRUD & Step Reports", () => {
  let token: string;
  let loggedInUserId: string;
  let createdDailyReportId: string;
  let createdStepReportId: string;
  let targetKitchenId = "a0f82909-2f65-470c-9edf-1b3a2e5ea46a";

  const getConfig = (
    contentType: string = "application/x-www-form-urlencoded"
  ): AxiosRequestConfig => ({
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
  });

  test("POST /daily-reports creates a new report", async () => {
    const res = await axios(`${BASE_URL}`, {
      method: "POST",
      ...getConfig(),
      data: {
        entityType: "kitchen",
        entityId: targetKitchenId,
        date: new Date().toISOString().split("T")[0],
        status: "PENDING",
        notes: `Daily check ${UNIQUE_SUFFIX}`,
        createdBy: loggedInUserId,
      },
    });

    expect(res.status).toBe(201);
    expect(res.data.data.id).toBeDefined();

    createdDailyReportId = res.data.data.id;
  });

  //   test("GET /daily-reports returns a list", async () => {
  //     const res = await axios(`${BASE_URL}?entityType=kitchen`, {
  //       method: "GET",
  //       ...getConfig(),
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.data).toBeInstanceOf(Array);
  //   });

  //   test("GET /daily-reports/:id returns detail", async () => {
  //     const res = await axios(`${BASE_URL}/${createdDailyReportId}`, {
  //       method: "GET",
  //       ...getConfig(),
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.data.id).toBe(createdDailyReportId);
  //   });

  //   test("PUT /daily-reports/:id updates the report", async () => {
  //     const res = await axios(`${BASE_URL}/${createdDailyReportId}`, {
  //       method: "PUT",
  //       ...getConfig(),
  //       data: {
  //         status: "DONE",
  //         notes: `Updated note ${UNIQUE_SUFFIX}`,
  //         updatedBy: loggedInUserId,
  //       },
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.data.status).toBe("completed");
  //   });

  //   test("POST /daily-reports/:dailyReportId/steps creates step report", async () => {
  //     const res = await axios(`${BASE_URL}/${createdDailyReportId}/steps`, {
  //       method: "POST",
  //       ...getConfig(),
  //       data: {
  //         stepName: "cooking",
  //         status: "DONE",
  //         note: "Cooking completed successfully",
  //         imageId: null,
  //         createdBy: loggedInUserId,
  //       },
  //     });

  //     expect(res.status).toBe(201);
  //     expect(res.data.data.id).toBeDefined();
  //     createdStepReportId = res.data.data.id;
  //   });


  //   test("GET /daily-reports/:dailyReportId/steps returns all step reports", async () => {
  //     const res = await axios(`${BASE_URL}/${createdDailyReportId}/steps`, {
  //       method: "GET",
  //       ...getConfig(),
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.data).toBeInstanceOf(Array);
  //     expect(res.data.data.length).toBeGreaterThan(0);
  //   });

  //   test("PUT /daily-reports/steps/:id updates step report", async () => {
  //     const res = await axios(`${BASE_URL}/steps/${createdStepReportId}`, {
  //       method: "PUT",
  //       ...getConfig(),
  //       data: {
  //         note: "Updated cooking notes",
  //         updatedBy: loggedInUserId,
  //       },
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.data.note).toBe("Updated cooking notes");
  //   });

  //   test("DELETE /daily-reports/steps/:id deletes step report", async () => {
  //     const res = await axios(`${BASE_URL}/steps/${createdStepReportId}`, {
  //       method: "DELETE",
  //       ...getConfig(),
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.message).toBe("Step report deleted successfully");
  //   });

  //   test("DELETE /daily-reports/:id deletes the report", async () => {
  //     const res = await axios(`${BASE_URL}/${createdDailyReportId}`, {
  //       method: "DELETE",
  //       ...getConfig(),
  //     });

  //     expect(res.status).toBe(200);
  //     expect(res.data.message).toBe("Daily report deleted successfully");
  //   });
});
