// tests/auth/auth.register.test.js
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const {
  connectTestDB,
  clearTestDB,
  closeTestDB,
} = require("../setup/testDb");

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /auth/register", () => {
  test("debe registrar un usuario correctamente", async () => {
    const payload = {
      username: "rodrigo",
      email: "rodrigo@test.com",
      password: "123456",
      gamerTag: "RodriPro",
      platform: "PS",
      country: "Chile",
    };

    const res = await request(app).post("/auth/register").send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Usuario creado");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe("rodrigo@test.com");
    expect(res.body.user.username).toBe("rodrigo");
    expect(res.body.user.gamerTag).toBe("RodriPro");

    const savedUser = await User.findOne({ email: "rodrigo@test.com" }).select("+passwordHash");

    expect(savedUser).toBeTruthy();
    expect(savedUser.username).toBe("rodrigo");
    expect(savedUser.passwordHash).toBeTruthy();
    expect(savedUser.passwordHash).not.toBe("123456");
  });

  test("debe rechazar email duplicado", async () => {
    const payload = {
      username: "rodrigo",
      email: "rodrigo@test.com",
      password: "123456",
      gamerTag: "RodriPro",
      platform: "PS",
      country: "Chile",
    };

    await request(app).post("/auth/register").send(payload);

    const secondPayload = {
      username: "rodrigo2",
      email: "rodrigo@test.com",
      password: "123456",
      gamerTag: "RodriPro2",
      platform: "PS",
      country: "Chile",
    };

    const res = await request(app).post("/auth/register").send(secondPayload);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Email ya registrado");
  });

  test("debe rechazar username duplicado ignorando mayúsculas/minúsculas", async () => {
    const payload = {
      username: "Rodrigo",
      email: "rodrigo@test.com",
      password: "123456",
      gamerTag: "RodriPro",
      platform: "PS",
      country: "Chile",
    };

    await request(app).post("/auth/register").send(payload);

    const secondPayload = {
      username: "rodrigo",
      email: "otro@test.com",
      password: "123456",
      gamerTag: "OtroTag",
      platform: "PS",
      country: "Chile",
    };

    const res = await request(app).post("/auth/register").send(secondPayload);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Username ya registrado");
  });

  test("debe rechazar cuando faltan campos obligatorios", async () => {
    const res = await request(app).post("/auth/register").send({
      username: "",
      email: "",
      password: "",
      gamerTag: "",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "username, email, password y gamerTag son obligatorios"
    );
  });

  test("debe rechazar plataforma inválida", async () => {
    const res = await request(app).post("/auth/register").send({
      username: "rodrigo",
      email: "rodrigo@test.com",
      password: "123456",
      gamerTag: "RodriPro",
      platform: "SWITCH",
      country: "Chile",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Plataforma inválida. Valores permitidos: PS, XBOX, PC"
    );
  });
});