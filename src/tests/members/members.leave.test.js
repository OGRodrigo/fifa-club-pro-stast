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

describe("DELETE /clubs/:clubId/leave - leave club", () => {
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
    const user = await createUser({
      username: "leave_no_token_user",
      email: "leave_no_token_user@test.com",
      gamerTag: "LeaveNoTokenUser",
    });

    const club = await createClub({
      name: "Club Leave No Token",
      members: [{ user: user._id, role: "member" }],
    });

    const res = await request(app).delete(`/clubs/${club._id}/leave`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("member puede salir del club", async () => {
    const member = await createUser({
      username: "leave_member_ok",
      email: "leave_member_ok@test.com",
      gamerTag: "LeaveMemberOK",
    });

    const club = await createClub({
      name: "Club Leave Member",
      members: [{ user: member._id, role: "member" }],
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/saliste del club/i);

    const updatedClub = await Club.findById(club._id);
    const stillMember = updatedClub.members.find(
      (m) => m.user.toString() === member._id.toString()
    );

    expect(stillMember).toBeUndefined();
  });

  test("captain puede salir del club", async () => {
    const captain = await createUser({
      username: "leave_captain_ok",
      email: "leave_captain_ok@test.com",
      gamerTag: "LeaveCaptainOK",
    });

    const admin = await createUser({
      username: "leave_captain_admin_support",
      email: "leave_captain_admin_support@test.com",
      gamerTag: "LeaveCaptainAdminSupport",
    });

    const club = await createClub({
      name: "Club Leave Captain",
      members: [
        { user: admin._id, role: "admin" },
        { user: captain._id, role: "captain" },
      ],
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);

    const updatedClub = await Club.findById(club._id);
    const stillCaptain = updatedClub.members.find(
      (m) => m.user.toString() === captain._id.toString()
    );

    expect(stillCaptain).toBeUndefined();
  });

  test("admin puede salir si no es el único admin", async () => {
    const admin1 = await createUser({
      username: "leave_admin_ok_1",
      email: "leave_admin_ok_1@test.com",
      gamerTag: "LeaveAdminOK1",
    });

    const admin2 = await createUser({
      username: "leave_admin_ok_2",
      email: "leave_admin_ok_2@test.com",
      gamerTag: "LeaveAdminOK2",
    });

    const club = await createClub({
      name: "Club Leave Admin OK",
      members: [
        { user: admin1._id, role: "admin" },
        { user: admin2._id, role: "admin" },
      ],
    });

    const token = makeToken(admin1._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);

    const updatedClub = await Club.findById(club._id);
    const stillAdmin1 = updatedClub.members.find(
      (m) => m.user.toString() === admin1._id.toString()
    );
    const admins = updatedClub.members.filter((m) => m.role === "admin");

    expect(stillAdmin1).toBeUndefined();
    expect(admins).toHaveLength(1);
  });

  test("no debe permitir salir al único admin", async () => {
    const admin = await createUser({
      username: "leave_only_admin_block",
      email: "leave_only_admin_block@test.com",
      gamerTag: "LeaveOnlyAdminBlock",
    });

    const member = await createUser({
      username: "leave_only_admin_member",
      email: "leave_only_admin_member@test.com",
      gamerTag: "LeaveOnlyAdminMember",
    });

    const club = await createClub({
      name: "Club Leave Only Admin",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/único admin/i);

    const sameClub = await Club.findById(club._id);
    const stillAdmin = sameClub.members.find(
      (m) => m.user.toString() === admin._id.toString()
    );

    expect(stillAdmin).toBeTruthy();
    expect(stillAdmin.role).toBe("admin");
  });

  test("debe responder 404 si el club no existe", async () => {
    const user = await createUser({
      username: "leave_missing_club_user",
      email: "leave_missing_club_user@test.com",
      gamerTag: "LeaveMissingClubUser",
    });

    const token = makeToken(user._id);
    const fakeClubId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app)
      .delete(`/clubs/${fakeClubId}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 404 si el usuario no es miembro del club", async () => {
    const admin = await createUser({
      username: "leave_non_member_admin",
      email: "leave_non_member_admin@test.com",
      gamerTag: "LeaveNonMemberAdmin",
    });

    const outsider = await createUser({
      username: "leave_non_member_outsider",
      email: "leave_non_member_outsider@test.com",
      gamerTag: "LeaveNonMemberOutsider",
    });

    const club = await createClub({
      name: "Club Leave Non Member",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });
});