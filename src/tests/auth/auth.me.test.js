const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const User = require("../../models/User");
const Club = require("../../models/Club");
const { connectTestDB, clearTestDB, closeTestDB } = require("../setup/testDb");

describe("GET /auth/me", () => {
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

  function makeToken(userId) {
    return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  test("debe rechazar si no se envía token", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("debe devolver clubContext null si el usuario no pertenece a un club", async () => {
    const user = await createTestUser();
    const token = makeToken(user._id);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      clubContext: null,
    });
  });

  test("debe devolver clubContext cuando el usuario pertenece a un club como admin", async () => {
    const user = await createTestUser();
    const token = makeToken(user._id);

    const club = await Club.create({
      name: "FC Prueba",
      country: "Chile",
      members: [
        {
          user: user._id,
          role: "admin",
        },
      ],
      joinRequests: [],
    });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      clubContext: {
        clubId: String(club._id),
        role: "admin",
      },
    });
  });

  test("debe devolver clubContext cuando el usuario pertenece a un club como captain", async () => {
    const user = await createTestUser(
      {
        username: "captain1",
        email: "captain1@test.com",
      }
    );
    const token = makeToken(user._id);

    const club = await Club.create({
      name: "FC Captain",
      country: "Chile",
      members: [
        {
          user: user._id,
          role: "captain",
        },
      ],
      joinRequests: [],
    });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      clubContext: {
        clubId: String(club._id),
        role: "captain",
      },
    });
  });

  test("debe devolver clubContext cuando el usuario pertenece a un club como member", async () => {
    const user = await createTestUser({
      username: "member1",
      email: "member1@test.com",
    });
    const token = makeToken(user._id);

    const club = await Club.create({
      name: "FC Member",
      country: "Chile",
      members: [
        {
          user: user._id,
          role: "member",
        },
      ],
      joinRequests: [],
    });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      clubContext: {
        clubId: String(club._id),
        role: "member",
      },
    });
  });

  test("debe rechazar token inválido", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer token-invalido");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });
});