import axios from "axios";
import { describe, expect, test } from "bun:test";

describe("Auth API CRUD", () => {
  let refreshToken = "";

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
    const data = res.data;

    expect(data.data.email).toBe("raihan.ardianata@gmail.com");
    expect(data.data.authorization.token).toBeDefined();
    expect(data.data.authorization.refreshToken).toBeDefined();

    refreshToken = data.data.authorization.refreshToken;
  });

  // test("POST /api/auth/forgot-password returns link", async () => {
  //   const res = await axios("http://localhost:3000/api/auth/forgot-password", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     data: {
  //       username: "raihan.ardianata@gmail.com",
  //     },
  //   });

  //   expect(res.status).toBe(200);
  //   const data = res.data;

  //   expect(data.message).toBe("Reset password email has been sent");
  // });

  // test("POST /api/auth/reset-password", async () => {
  //   const res = await axios("http://localhost:3000/api/auth/forgot-password", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     data: {
  //       token: "", password: "", confirmPassword: ""
  //     },
  //   });

  //   expect(res.status).toBe(200);
  //   const data = res.data;

  //   expect(data.message).toBe("Password has been successfully reset");
  // });

  test("POST /api/auth/register creates a new user", async () => {
    const email = `raihan.ardianata-test-${Date.now()}@gmail.com`; // biar unik setiap run
    const res = await axios("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        email,
        password: "Password@1",
      },
    });

    expect(res.status).toBe(200);

    const data = res.data;
    expect(data).toHaveProperty("data");
    expect(data.data.email).toBe(email);
    expect(data.data).toHaveProperty("id");
    expect(data.data.isActive).toBe(true);
    expect(data.data.isDeleted).toBe(false);
    expect(data.data).toHaveProperty("createdAt");
    expect(data.data).toHaveProperty("updatedAt");
  });

  test("POST /api/auth/refresh refresh token user", async () => {
    const res = await axios("http://localhost:3000/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", },
      data: {
        refreshToken,
      },
    });

    expect(res.status).toBe(200);
    const data = res.data;

    expect(data.data.authorization.token).toBeDefined();
    expect(data.data.authorization.refreshToken).toBeDefined();
  });


  test("POST /api/auth/logout logout a  user", async () => {
    const res = await axios("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", },
      data: {
        refreshToken,
      },
    });

    expect(res.status).toBe(200);

    const data = res.data;

    expect(data.message).toBe("Logout successful");
  });

});
