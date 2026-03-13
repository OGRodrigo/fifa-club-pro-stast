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

describe("GET /clubs/:clubId/join-requests - read join requests", () => {
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
      name: "Club Read Join No Token",
      members: [],
      joinRequests: [],
    });

    const res = await request(app).get(`/clubs/${club._id}/join-requests`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede ver las solicitudes", async () => {
    const admin = await createUser({
      username: "admin_read_join",
      email: "admin_read_join@test.com",
      gamerTag: "AdminReadJoin",
    });

    const applicant = await createUser({
      username: "applicant_read_join",
      email: "applicant_read_join@test.com",
      gamerTag: "ApplicantReadJoin",
    });

    const club = await createClub({
      name: "Club Read Join Admin",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("club");
    expect(res.body).toHaveProperty("requests");
    expect(res.body.club.name).toBe("Club Read Join Admin");
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].status).toBe("pending");
    expect(res.body.requests[0].user).toBeTruthy();
  });

  test("captain puede ver las solicitudes", async () => {
    const captain = await createUser({
      username: "captain_read_join",
      email: "captain_read_join@test.com",
      gamerTag: "CaptainReadJoin",
    });

    const applicant = await createUser({
      username: "applicant_read_join_captain",
      email: "applicant_read_join_captain@test.com",
      gamerTag: "ApplicantReadJoinCaptain",
    });

    const club = await createClub({
      name: "Club Read Join Captain",
      members: [{ user: captain._id, role: "captain" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.requests).toHaveLength(1);
  });

  test("member no puede ver las solicitudes", async () => {
    const member = await createUser({
      username: "member_read_join_block",
      email: "member_read_join_block@test.com",
      gamerTag: "MemberReadJoinBlock",
    });

    const applicant = await createUser({
      username: "applicant_read_join_block",
      email: "applicant_read_join_block@test.com",
      gamerTag: "ApplicantReadJoinBlock",
    });

    const club = await createClub({
      name: "Club Read Join Block Member",
      members: [{ user: member._id, role: "member" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("usuario externo no puede ver solicitudes de un club ajeno", async () => {
    const admin = await createUser({
      username: "admin_read_join_external",
      email: "admin_read_join_external@test.com",
      gamerTag: "AdminReadJoinExternal",
    });

    const outsider = await createUser({
      username: "outsider_read_join_external",
      email: "outsider_read_join_external@test.com",
      gamerTag: "OutsiderReadJoinExternal",
    });

    const applicant = await createUser({
      username: "applicant_read_join_external",
      email: "applicant_read_join_external@test.com",
      gamerTag: "ApplicantReadJoinExternal",
    });

    const club = await createClub({
      name: "Club Read Join External",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 404 si el club no existe", async () => {
    const admin = await createUser({
      username: "admin_read_join_missing_club",
      email: "admin_read_join_missing_club@test.com",
      gamerTag: "AdminReadJoinMissingClub",
    });

    const token = makeToken(admin._id);
    const fakeClubId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app)
      .get(`/clubs/${fakeClubId}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe devolver requests vacío si no hay solicitudes", async () => {
    const admin = await createUser({
      username: "admin_read_join_empty",
      email: "admin_read_join_empty@test.com",
      gamerTag: "AdminReadJoinEmpty",
    });

    const club = await createClub({
      name: "Club Read Join Empty",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/join-requests`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.requests).toHaveLength(0);
  });
});