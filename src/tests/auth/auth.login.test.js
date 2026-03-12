const request = require("supertest");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = require("../../app");
const User = require("../../models/User");
const { connectTestDB, clearTestDB, closeTestDB } = require("../setup/testDb");

describe("POST /auth/login", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  async function createTestUser(overrides = {}) {
    const passwordHash = await bcrypt.hash("123456", 10);

    const user = await User.create({
      username: "rodrigo",
      email: "rodrigo@test.com",
      passwordHash,
      gamerTag: "RodriPro",
      platform: "PS",
      country: "Chile",
      ...overrides,
    });

    return user;
  }

  test("debe hacer login correctamente con credenciales válidas", async () => {
    await createTestUser();

    const res = await request(app).post("/auth/login").send({
      email: "rodrigo@test.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(200);

    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(10);

    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toMatchObject({
      username: "rodrigo",
      email: "rodrigo@test.com",
      gamerTag: "RodriPro",
      platform: "PS",
      country: "Chile",
    });

    expect(res.body.user).toHaveProperty("id");
  });

  test("debe normalizar email en login aunque venga con mayúsculas", async () => {
    await createTestUser({
      email: "rodrigo@test.com",
    });

    const res = await request(app).post("/auth/login").send({
      email: "RODRIGO@TEST.COM",
      password: "123456",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("rodrigo@test.com");
  });

  test("debe rechazar email inexistente", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "noexiste@test.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Credenciales inválidas");
  });

  test("debe rechazar password incorrecta", async () => {
    await createTestUser();

    const res = await request(app).post("/auth/login").send({
      email: "rodrigo@test.com",
      password: "password-mala",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Credenciales inválidas");
  });

  test("debe rechazar cuando falta email", async () => {
    await createTestUser();

    const res = await request(app).post("/auth/login").send({
      password: "123456",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email y password requeridos");
  });

  test("debe rechazar cuando falta password", async () => {
    await createTestUser();

    const res = await request(app).post("/auth/login").send({
      email: "rodrigo@test.com",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email y password requeridos");
  });

  test("debe devolver clubContext null si el usuario no pertenece a un club", async () => {
    await createTestUser();

    const res = await request(app).post("/auth/login").send({
      email: "rodrigo@test.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("clubContext");
    expect(res.body.clubContext).toBeNull();
  });
});