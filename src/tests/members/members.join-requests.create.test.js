const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const User = require("../../models/User");
const Club = require("../../models/Club");

const {
  connectTestDB,
  clearTestDB,
  closeTestDB,
} = require("../setup/testDb");

function makeToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function createUser({
  username,
  email,
  gamerTag,
  platform = "PS",
  country = "Chile",
  password = "123456",
} = {}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    username,
    email,
    passwordHash,
    gamerTag,
    platform,
    country,
  });
}

async function createClub({
  name,
  country = "Chile",
  founded,
  isPrivate = false,
  members = [],
  joinRequests = [],
} = {}) {
  return Club.create({
    name,
    country,
    founded,
    isPrivate,
    members,
    joinRequests,
  });
}

describe("POST /clubs/:clubId/join-requests - request to join club", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  test("debe responder 401 si no hay token", async () => {
    const club = await createClub({
      name: "Club Join No Token",
      members: [],
      joinRequests: [],
    });

    const res = await request(app).post(`/clubs/${club._id}/join-requests`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("usuario autenticado puede enviar solicitud", async () => {
    const user = await createUser({
      username: "join_user_ok",
      email: "join_user_ok@test.com",
      gamerTag: "JoinUserOK",
    });

    const club = await createClub({
      name: "Club Join OK",
      members: [],
      joinRequests: [],
    });

    const token = makeToken(user._id);

    const res = await request(app)
      .post(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/solicitud enviada/i);

    const updatedClub = await Club.findById(club._id);
    expect(Array.isArray(updatedClub.joinRequests)).toBe(true);
    expect(updatedClub.joinRequests).toHaveLength(1);
    expect(updatedClub.joinRequests[0].user.toString()).toBe(user._id.toString());
    expect(updatedClub.joinRequests[0].status).toBe("pending");
  });

  test("debe responder 404 si el club no existe", async () => {
    const user = await createUser({
      username: "join_missing_club",
      email: "join_missing_club@test.com",
      gamerTag: "JoinMissingClub",
    });

    const token = makeToken(user._id);
    const fakeClubId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app)
      .post(`/clubs/${fakeClubId}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/club no encontrado/i);
  });

  test("debe rechazar si el usuario ya es miembro del club", async () => {
    const user = await createUser({
      username: "join_already_member",
      email: "join_already_member@test.com",
      gamerTag: "JoinAlreadyMember",
    });

    const club = await createClub({
      name: "Club Join Already Member",
      members: [{ user: user._id, role: "member" }],
      joinRequests: [],
    });

    const token = makeToken(user._id);

    const res = await request(app)
      .post(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ya eres miembro del club/i);

    const sameClub = await Club.findById(club._id);
    expect(sameClub.joinRequests).toHaveLength(0);
  });

  test("debe rechazar si ya existe una solicitud pending", async () => {
    const user = await createUser({
      username: "join_duplicate_pending",
      email: "join_duplicate_pending@test.com",
      gamerTag: "JoinDuplicatePending",
    });

    const club = await createClub({
      name: "Club Join Duplicate Pending",
      members: [],
      joinRequests: [{ user: user._id, status: "pending" }],
    });

    const token = makeToken(user._id);

    const res = await request(app)
      .post(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/solicitud ya enviada/i);

    const sameClub = await Club.findById(club._id);
    expect(sameClub.joinRequests).toHaveLength(1);
  });

  test("debe permitir nueva solicitud si la anterior no está pending", async () => {
    const user = await createUser({
      username: "join_old_rejected",
      email: "join_old_rejected@test.com",
      gamerTag: "JoinOldRejected",
    });

    const club = await createClub({
      name: "Club Join Old Rejected",
      members: [],
      joinRequests: [{ user: user._id, status: "rejected" }],
    });

    const token = makeToken(user._id);

    const res = await request(app)
      .post(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message");

    const updatedClub = await Club.findById(club._id);
    expect(updatedClub.joinRequests).toHaveLength(2);

    const pendingRequests = updatedClub.joinRequests.filter(
      (r) => r.user.toString() === user._id.toString() && r.status === "pending"
    );
    expect(pendingRequests).toHaveLength(1);
  });

  test("debe inicializar joinRequests si no existe como array", async () => {
    const user = await createUser({
      username: "join_init_array",
      email: "join_init_array@test.com",
      gamerTag: "JoinInitArray",
    });

    const club = await createClub({
      name: "Club Join Init Array",
      members: [],
    });

    const token = makeToken(user._id);

    const res = await request(app)
      .post(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);

    const updatedClub = await Club.findById(club._id);
    expect(Array.isArray(updatedClub.joinRequests)).toBe(true);
    expect(updatedClub.joinRequests.length).toBeGreaterThanOrEqual(1);
  });
});