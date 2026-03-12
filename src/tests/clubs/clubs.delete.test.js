const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const User = require("../../models/User");
const Club = require("../../models/Club");
const { connectTestDB, clearTestDB, closeTestDB } = require("../setup/testDb");

describe("DELETE /clubs/:clubId", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  async function createUser(overrides = {}) {
    const passwordHash = await bcrypt.hash("123456", 10);

    return User.create({
      username: "userbase",
      email: "userbase@test.com",
      passwordHash,
      gamerTag: "UserBase",
      platform: "PS",
      country: "Chile",
      ...overrides,
    });
  }

  function makeToken(userId) {
    return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  async function createClubWithAdminAndMember() {
    const admin = await createUser({
      username: "adminclub",
      email: "adminclub@test.com",
      gamerTag: "AdminClub",
    });

    const captain = await createUser({
      username: "captainclub",
      email: "captainclub@test.com",
      gamerTag: "CaptainClub",
    });

    const member = await createUser({
      username: "memberclub",
      email: "memberclub@test.com",
      gamerTag: "MemberClub",
    });

    const outsider = await createUser({
      username: "outsiderclub",
      email: "outsiderclub@test.com",
      gamerTag: "OutsiderClub",
    });

    const club = await Club.create({
      name: "FC Delete Test",
      country: "Chile",
      members: [
        { user: admin._id, role: "admin" },
        { user: captain._id, role: "captain" },
        { user: member._id, role: "member" },
      ],
      joinRequests: [],
    });

    return { club, admin, captain, member, outsider };
  }

  test("debe eliminar el club si el usuario es admin", async () => {
    const { club, admin } = await createClubWithAdminAndMember();
    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/club y partidos asociados eliminados correctamente/i);
    const clubInDb = await Club.findById(club._id);
    expect(clubInDb).toBeNull();
  });

  test("debe rechazar si no hay token", async () => {
    const { club } = await createClubWithAdminAndMember();

    const res = await request(app).delete(`/clubs/${club._id}`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("debe rechazar si el usuario es captain", async () => {
    const { club, captain } = await createClubWithAdminAndMember();
    const token = makeToken(captain._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const clubInDb = await Club.findById(club._id);
    expect(clubInDb).toBeTruthy();
  });

  test("debe rechazar si el usuario es member", async () => {
    const { club, member } = await createClubWithAdminAndMember();
    const token = makeToken(member._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const clubInDb = await Club.findById(club._id);
    expect(clubInDb).toBeTruthy();
  });

  test("debe rechazar si el usuario no pertenece al club", async () => {
    const { club, outsider } = await createClubWithAdminAndMember();
    const token = makeToken(outsider._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const clubInDb = await Club.findById(club._id);
    expect(clubInDb).toBeTruthy();
  });

  test("debe responder 404 si el club no existe", async () => {
    const admin = await createUser({
      username: "admin404",
      email: "admin404@test.com",
      gamerTag: "Admin404",
    });

    const token = makeToken(admin._id);
    const fakeClubId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .delete(`/clubs/${fakeClubId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/club no encontrado/i);
  });

  test("debe responder 400 si el id es inválido", async () => {
    const admin = await createUser({
      username: "admininvalid",
      email: "admininvalid@test.com",
      gamerTag: "AdminInvalid",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete("/clubs/id-invalido")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});