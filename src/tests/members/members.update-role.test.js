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

describe("PUT /clubs/:clubId/members/:userId/role - update member role", () => {
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
    const admin = await createUser({
      username: "admin_no_token_role",
      email: "admin_no_token_role@test.com",
      gamerTag: "AdminNoTokenRole",
    });

    const member = await createUser({
      username: "member_no_token_role",
      email: "member_no_token_role@test.com",
      gamerTag: "MemberNoTokenRole",
    });

    const club = await createClub({
      name: "Club Sin Token Role",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${member._id}/role`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede cambiar member a captain", async () => {
    const admin = await createUser({
      username: "admin_promote_member",
      email: "admin_promote_member@test.com",
      gamerTag: "AdminPromoteMember",
    });

    const member = await createUser({
      username: "member_promoted",
      email: "member_promoted@test.com",
      gamerTag: "MemberPromoted",
    });

    const club = await createClub({
      name: "Club Promote Member",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${member._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Rol actualizado");
    expect(res.body).toHaveProperty("role", "captain");

    const updatedClub = await Club.findById(club._id);
    const updatedMember = updatedClub.members.find(
      (m) => m.user.toString() === member._id.toString()
    );

    expect(updatedMember).toBeTruthy();
    expect(updatedMember.role).toBe("captain");
  });

  test("admin puede cambiar captain a member", async () => {
    const admin = await createUser({
      username: "admin_demote_captain",
      email: "admin_demote_captain@test.com",
      gamerTag: "AdminDemoteCaptain",
    });

    const captain = await createUser({
      username: "captain_demoted",
      email: "captain_demoted@test.com",
      gamerTag: "CaptainDemoted",
    });

    const club = await createClub({
      name: "Club Demote Captain",
      members: [
        { user: admin._id, role: "admin" },
        { user: captain._id, role: "captain" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${captain._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "member" });

    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe("member");

    const updatedClub = await Club.findById(club._id);
    const updatedCaptain = updatedClub.members.find(
      (m) => m.user.toString() === captain._id.toString()
    );

    expect(updatedCaptain.role).toBe("member");
  });

  test("member no puede cambiar roles", async () => {
    const admin = await createUser({
      username: "admin_role_block_member",
      email: "admin_role_block_member@test.com",
      gamerTag: "AdminRoleBlockMember",
    });

    const memberActor = await createUser({
      username: "member_actor_block",
      email: "member_actor_block@test.com",
      gamerTag: "MemberActorBlock",
    });

    const target = await createUser({
      username: "target_member_block",
      email: "target_member_block@test.com",
      gamerTag: "TargetMemberBlock",
    });

    const club = await createClub({
      name: "Club Role Block Member",
      members: [
        { user: admin._id, role: "admin" },
        { user: memberActor._id, role: "member" },
        { user: target._id, role: "member" },
      ],
    });

    const token = makeToken(memberActor._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${target._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const sameClub = await Club.findById(club._id);
    const targetMember = sameClub.members.find(
      (m) => m.user.toString() === target._id.toString()
    );

    expect(targetMember.role).toBe("member");
  });

  test("captain no puede cambiar roles porque la ruta permite solo admin", async () => {
    const admin = await createUser({
      username: "admin_role_block_captain",
      email: "admin_role_block_captain@test.com",
      gamerTag: "AdminRoleBlockCaptain",
    });

    const captainActor = await createUser({
      username: "captain_actor_block",
      email: "captain_actor_block@test.com",
      gamerTag: "CaptainActorBlock",
    });

    const target = await createUser({
      username: "target_captain_block",
      email: "target_captain_block@test.com",
      gamerTag: "TargetCaptainBlock",
    });

    const club = await createClub({
      name: "Club Role Block Captain",
      members: [
        { user: admin._id, role: "admin" },
        { user: captainActor._id, role: "captain" },
        { user: target._id, role: "member" },
      ],
    });

    const token = makeToken(captainActor._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${target._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("usuario externo no puede cambiar roles de un club ajeno", async () => {
    const admin = await createUser({
      username: "admin_role_external",
      email: "admin_role_external@test.com",
      gamerTag: "AdminRoleExternal",
    });

    const target = await createUser({
      username: "target_role_external",
      email: "target_role_external@test.com",
      gamerTag: "TargetRoleExternal",
    });

    const outsider = await createUser({
      username: "outsider_role_external",
      email: "outsider_role_external@test.com",
      gamerTag: "OutsiderRoleExternal",
    });

    const club = await createClub({
      name: "Club External Role",
      members: [
        { user: admin._id, role: "admin" },
        { user: target._id, role: "member" },
      ],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${target._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si el rol es inválido", async () => {
    const admin = await createUser({
      username: "admin_invalid_role",
      email: "admin_invalid_role@test.com",
      gamerTag: "AdminInvalidRole",
    });

    const member = await createUser({
      username: "member_invalid_role",
      email: "member_invalid_role@test.com",
      gamerTag: "MemberInvalidRole",
    });

    const club = await createClub({
      name: "Club Invalid Role",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${member._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "owner" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/rol inválido/i);
  });

  test("debe responder 404 si el club no existe", async () => {
    const admin = await createUser({
      username: "admin_missing_club_role",
      email: "admin_missing_club_role@test.com",
      gamerTag: "AdminMissingClubRole",
    });

    const member = await createUser({
      username: "member_missing_club_role",
      email: "member_missing_club_role@test.com",
      gamerTag: "MemberMissingClubRole",
    });

    const token = makeToken(admin._id);
    const fakeClubId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app)
      .put(`/clubs/${fakeClubId}/members/${member._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 404 si el miembro no existe dentro del club", async () => {
    const admin = await createUser({
      username: "admin_missing_member_role",
      email: "admin_missing_member_role@test.com",
      gamerTag: "AdminMissingMemberRole",
    });

    const nonMember = await createUser({
      username: "non_member_role",
      email: "non_member_role@test.com",
      gamerTag: "NonMemberRole",
    });

    const club = await createClub({
      name: "Club Missing Member Role",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${nonMember._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/miembro no encontrado/i);
  });

  test("no debe permitir quitar el rol al único admin", async () => {
    const admin = await createUser({
      username: "only_admin_role_block",
      email: "only_admin_role_block@test.com",
      gamerTag: "OnlyAdminRoleBlock",
    });

    const member = await createUser({
      username: "member_only_admin_role_block",
      email: "member_only_admin_role_block@test.com",
      gamerTag: "MemberOnlyAdminRoleBlock",
    });

    const club = await createClub({
      name: "Club Only Admin Role Block",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${admin._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/único admin/i);

    const sameClub = await Club.findById(club._id);
    const adminMember = sameClub.members.find(
      (m) => m.user.toString() === admin._id.toString()
    );

    expect(adminMember.role).toBe("admin");
  });

  test("sí debe permitir cambiar rol de un admin si existe otro admin", async () => {
    const admin1 = await createUser({
      username: "admin1_multi_admin_role",
      email: "admin1_multi_admin_role@test.com",
      gamerTag: "Admin1MultiAdminRole",
    });

    const admin2 = await createUser({
      username: "admin2_multi_admin_role",
      email: "admin2_multi_admin_role@test.com",
      gamerTag: "Admin2MultiAdminRole",
    });

    const club = await createClub({
      name: "Club Multi Admin Role",
      members: [
        { user: admin1._id, role: "admin" },
        { user: admin2._id, role: "admin" },
      ],
    });

    const token = makeToken(admin1._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/members/${admin2._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "captain" });

    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe("captain");

    const updatedClub = await Club.findById(club._id);
    const updatedAdmin2 = updatedClub.members.find(
      (m) => m.user.toString() === admin2._id.toString()
    );

    expect(updatedAdmin2.role).toBe("captain");
  });
});