const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const User = require("../../models/User");
const Club = require("../../models/Club");
const { connectTestDB, clearTestDB, closeTestDB } = require("../setup/testDb");

describe("POST /clubs", () => {
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
      username: "clubowner",
      email: "clubowner@test.com",
      passwordHash,
      gamerTag: "ClubOwner",
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

  test("debe crear un club correctamente y dejar al creador como admin", async () => {
    const user = await createTestUser();
    const token = makeToken(user._id);

    const payload = {
      name: "FC Test Final",
      country: "Chile",
    };

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.name).toBe("FC Test Final");
    expect(res.body.country).toBe("Chile");
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members).toHaveLength(1);
    expect(String(res.body.members[0].user)).toBe(String(user._id));
    expect(res.body.members[0].role).toBe("admin");

    const clubInDb = await Club.findById(res.body._id);
    expect(clubInDb).toBeTruthy();
    expect(clubInDb.name).toBe("FC Test Final");
    expect(clubInDb.members).toHaveLength(1);
    expect(String(clubInDb.members[0].user)).toBe(String(user._id));
    expect(clubInDb.members[0].role).toBe("admin");
  });

  test("debe rechazar si no hay token", async () => {
    const res = await request(app).post("/clubs").send({
      name: "FC Sin Token",
      country: "Chile",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("debe rechazar si falta name", async () => {
    const user = await createTestUser();
    const token = makeToken(user._id);

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        country: "Chile",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/name y country son obligatorios/i);
  });

  test("debe rechazar si falta country", async () => {
    const user = await createTestUser();
    const token = makeToken(user._id);

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "FC Sin Pais",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/name y country son obligatorios/i);
  });

  test("debe rechazar nombre de club duplicado", async () => {
    const firstUser = await createTestUser();
    const secondUser = await createTestUser({
      username: "clubowner2",
      email: "clubowner2@test.com",
      gamerTag: "ClubOwner2",
    });

    const firstToken = makeToken(firstUser._id);
    const secondToken = makeToken(secondUser._id);

    await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "FC Duplicado",
        country: "Chile",
      });

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        name: "FC Duplicado",
        country: "Argentina",
      });

    expect([400, 409, 500]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");

    const clubs = await Club.find({ name: "FC Duplicado" });
    expect(clubs).toHaveLength(1);
  });

  test("debe rechazar si el usuario ya pertenece a un club", async () => {
    const user = await createTestUser();
    const token = makeToken(user._id);

    await Club.create({
      name: "FC Ya Tiene Club",
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
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "FC Nuevo Intento",
        country: "Chile",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/ya perteneces a un club/i);
  });
});