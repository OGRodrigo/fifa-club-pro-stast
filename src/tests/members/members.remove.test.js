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

describe("DELETE /clubs/:clubId/members/:userId - remove member", () => {
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
      username: "admin_remove_no_token",
      email: "admin_remove_no_token@test.com",
      gamerTag: "AdminRemoveNoToken",
    });

    const member = await createUser({
      username: "member_remove_no_token",
      email: "member_remove_no_token@test.com",
      gamerTag: "MemberRemoveNoToken",
    });

    const club = await createClub({
      name: "Club Remove No Token",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const res = await request(app).delete(
      `/clubs/${club._id}/members/${member._id}`
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede eliminar a un member", async () => {
    const admin = await createUser({
      username: "admin_remove_member",
      email: "admin_remove_member@test.com",
      gamerTag: "AdminRemoveMember",
    });

    const member = await createUser({
      username: "member_removed_ok",
      email: "member_removed_ok@test.com",
      gamerTag: "MemberRemovedOK",
    });

    const club = await createClub({
      name: "Club Remove Member",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/miembro eliminado del club/i);

    const updatedClub = await Club.findById(club._id);
    const foundMember = updatedClub.members.find(
      (m) => m.user.toString() === member._id.toString()
    );

    expect(foundMember).toBeUndefined();
    expect(updatedClub.members).toHaveLength(1);
  });

  test("admin puede eliminar a un captain", async () => {
    const admin = await createUser({
      username: "admin_remove_captain",
      email: "admin_remove_captain@test.com",
      gamerTag: "AdminRemoveCaptain",
    });

    const captain = await createUser({
      username: "captain_removed_ok",
      email: "captain_removed_ok@test.com",
      gamerTag: "CaptainRemovedOK",
    });

    const club = await createClub({
      name: "Club Remove Captain",
      members: [
        { user: admin._id, role: "admin" },
        { user: captain._id, role: "captain" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${captain._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);

    const updatedClub = await Club.findById(club._id);
    const foundCaptain = updatedClub.members.find(
      (m) => m.user.toString() === captain._id.toString()
    );

    expect(foundCaptain).toBeUndefined();
  });

  test("member no puede eliminar miembros", async () => {
    const admin = await createUser({
      username: "admin_remove_block_member",
      email: "admin_remove_block_member@test.com",
      gamerTag: "AdminRemoveBlockMember",
    });

    const actorMember = await createUser({
      username: "actor_member_remove_block",
      email: "actor_member_remove_block@test.com",
      gamerTag: "ActorMemberRemoveBlock",
    });

    const targetMember = await createUser({
      username: "target_member_remove_block",
      email: "target_member_remove_block@test.com",
      gamerTag: "TargetMemberRemoveBlock",
    });

    const club = await createClub({
      name: "Club Remove Block Member",
      members: [
        { user: admin._id, role: "admin" },
        { user: actorMember._id, role: "member" },
        { user: targetMember._id, role: "member" },
      ],
    });

    const token = makeToken(actorMember._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${targetMember._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const sameClub = await Club.findById(club._id);
    const foundTarget = sameClub.members.find(
      (m) => m.user.toString() === targetMember._id.toString()
    );

    expect(foundTarget).toBeTruthy();
  });

  test("captain no puede eliminar miembros porque la ruta permite solo admin", async () => {
    const admin = await createUser({
      username: "admin_remove_block_captain",
      email: "admin_remove_block_captain@test.com",
      gamerTag: "AdminRemoveBlockCaptain",
    });

    const actorCaptain = await createUser({
      username: "actor_captain_remove_block",
      email: "actor_captain_remove_block@test.com",
      gamerTag: "ActorCaptainRemoveBlock",
    });

    const targetMember = await createUser({
      username: "target_remove_block_captain",
      email: "target_remove_block_captain@test.com",
      gamerTag: "TargetRemoveBlockCaptain",
    });

    const club = await createClub({
      name: "Club Remove Block Captain",
      members: [
        { user: admin._id, role: "admin" },
        { user: actorCaptain._id, role: "captain" },
        { user: targetMember._id, role: "member" },
      ],
    });

    const token = makeToken(actorCaptain._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${targetMember._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("usuario externo no puede eliminar miembros de un club ajeno", async () => {
    const admin = await createUser({
      username: "admin_remove_external",
      email: "admin_remove_external@test.com",
      gamerTag: "AdminRemoveExternal",
    });

    const targetMember = await createUser({
      username: "target_remove_external",
      email: "target_remove_external@test.com",
      gamerTag: "TargetRemoveExternal",
    });

    const outsider = await createUser({
      username: "outsider_remove_external",
      email: "outsider_remove_external@test.com",
      gamerTag: "OutsiderRemoveExternal",
    });

    const club = await createClub({
      name: "Club Remove External",
      members: [
        { user: admin._id, role: "admin" },
        { user: targetMember._id, role: "member" },
      ],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${targetMember._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 404 si el club no existe", async () => {
    const admin = await createUser({
      username: "admin_remove_missing_club",
      email: "admin_remove_missing_club@test.com",
      gamerTag: "AdminRemoveMissingClub",
    });

    const member = await createUser({
      username: "member_remove_missing_club",
      email: "member_remove_missing_club@test.com",
      gamerTag: "MemberRemoveMissingClub",
    });

    const token = makeToken(admin._id);
    const fakeClubId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app)
      .delete(`/clubs/${fakeClubId}/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 404 si el miembro no existe dentro del club", async () => {
    const admin = await createUser({
      username: "admin_remove_missing_member",
      email: "admin_remove_missing_member@test.com",
      gamerTag: "AdminRemoveMissingMember",
    });

    const nonMember = await createUser({
      username: "non_member_remove_missing",
      email: "non_member_remove_missing@test.com",
      gamerTag: "NonMemberRemoveMissing",
    });

    const club = await createClub({
      name: "Club Remove Missing Member",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${nonMember._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/miembro no encontrado/i);
  });

  test("no debe permitir eliminar al único admin", async () => {
    const admin = await createUser({
      username: "only_admin_remove_block",
      email: "only_admin_remove_block@test.com",
      gamerTag: "OnlyAdminRemoveBlock",
    });

    const member = await createUser({
      username: "member_only_admin_remove_block",
      email: "member_only_admin_remove_block@test.com",
      gamerTag: "MemberOnlyAdminRemoveBlock",
    });

    const club = await createClub({
      name: "Club Only Admin Remove Block",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${admin._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/único admin/i);

    const sameClub = await Club.findById(club._id);
    const adminStillThere = sameClub.members.find(
      (m) => m.user.toString() === admin._id.toString()
    );

    expect(adminStillThere).toBeTruthy();
    expect(adminStillThere.role).toBe("admin");
  });

  test("sí debe permitir eliminar a un admin si existe otro admin", async () => {
    const admin1 = await createUser({
      username: "admin1_remove_multi_admin",
      email: "admin1_remove_multi_admin@test.com",
      gamerTag: "Admin1RemoveMultiAdmin",
    });

    const admin2 = await createUser({
      username: "admin2_remove_multi_admin",
      email: "admin2_remove_multi_admin@test.com",
      gamerTag: "Admin2RemoveMultiAdmin",
    });

    const club = await createClub({
      name: "Club Remove Multi Admin",
      members: [
        { user: admin1._id, role: "admin" },
        { user: admin2._id, role: "admin" },
      ],
    });

    const token = makeToken(admin1._id);

    const res = await request(app)
      .delete(`/clubs/${club._id}/members/${admin2._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");

    const updatedClub = await Club.findById(club._id);
    const removedAdmin = updatedClub.members.find(
      (m) => m.user.toString() === admin2._id.toString()
    );

    expect(removedAdmin).toBeUndefined();

    const remainingAdmins = updatedClub.members.filter(
      (m) => m.role === "admin"
    );
    expect(remainingAdmins).toHaveLength(1);
  });
});