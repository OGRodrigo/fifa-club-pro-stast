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

describe("PUT /clubs/:clubId/join-requests/:userId - resolve join request", () => {
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
    const applicant = await createUser({
      username: "resolve_no_token_applicant",
      email: "resolve_no_token_applicant@test.com",
      gamerTag: "ResolveNoTokenApplicant",
    });

    const club = await createClub({
      name: "Club Resolve No Token",
      members: [],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede aceptar una solicitud y agregar al usuario como member", async () => {
    const admin = await createUser({
      username: "resolve_accept_admin",
      email: "resolve_accept_admin@test.com",
      gamerTag: "ResolveAcceptAdmin",
    });

    const applicant = await createUser({
      username: "resolve_accept_applicant",
      email: "resolve_accept_applicant@test.com",
      gamerTag: "ResolveAcceptApplicant",
    });

    const club = await createClub({
      name: "Club Resolve Accept",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/usuario agregado al club|usuario ya era miembro \(ok\)/i);

    const updatedClub = await Club.findById(club._id);
    const member = updatedClub.members.find(
      (m) => m.user.toString() === applicant._id.toString()
    );
    const pendingRequest = updatedClub.joinRequests.find(
      (r) => r.user.toString() === applicant._id.toString() && r.status === "pending"
    );

    expect(member).toBeTruthy();
    expect(member.role).toBe("member");
    expect(pendingRequest).toBeUndefined();
  });

  test("captain puede aceptar una solicitud", async () => {
    const captain = await createUser({
      username: "resolve_accept_captain",
      email: "resolve_accept_captain@test.com",
      gamerTag: "ResolveAcceptCaptain",
    });

    const applicant = await createUser({
      username: "resolve_accept_captain_applicant",
      email: "resolve_accept_captain_applicant@test.com",
      gamerTag: "ResolveAcceptCaptainApplicant",
    });

    const club = await createClub({
      name: "Club Resolve Accept Captain",
      members: [{ user: captain._id, role: "captain" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(200);

    const updatedClub = await Club.findById(club._id);
    const member = updatedClub.members.find(
      (m) => m.user.toString() === applicant._id.toString()
    );

    expect(member).toBeTruthy();
    expect(member.role).toBe("member");
  });

  test("admin puede rechazar una solicitud y eliminarla", async () => {
    const admin = await createUser({
      username: "resolve_reject_admin",
      email: "resolve_reject_admin@test.com",
      gamerTag: "ResolveRejectAdmin",
    });

    const applicant = await createUser({
      username: "resolve_reject_applicant",
      email: "resolve_reject_applicant@test.com",
      gamerTag: "ResolveRejectApplicant",
    });

    const club = await createClub({
      name: "Club Resolve Reject",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "reject" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/solicitud rechazada/i);

    const updatedClub = await Club.findById(club._id);
    const requestStillExists = updatedClub.joinRequests.find(
      (r) => r.user.toString() === applicant._id.toString()
    );
    const member = updatedClub.members.find(
      (m) => m.user.toString() === applicant._id.toString()
    );

    expect(requestStillExists).toBeUndefined();
    expect(member).toBeUndefined();
  });

  test("member no puede resolver solicitudes", async () => {
    const member = await createUser({
      username: "resolve_block_member",
      email: "resolve_block_member@test.com",
      gamerTag: "ResolveBlockMember",
    });

    const applicant = await createUser({
      username: "resolve_block_member_applicant",
      email: "resolve_block_member_applicant@test.com",
      gamerTag: "ResolveBlockMemberApplicant",
    });

    const club = await createClub({
      name: "Club Resolve Block Member",
      members: [{ user: member._id, role: "member" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("usuario externo no puede resolver solicitudes de un club ajeno", async () => {
    const admin = await createUser({
      username: "resolve_external_admin",
      email: "resolve_external_admin@test.com",
      gamerTag: "ResolveExternalAdmin",
    });

    const outsider = await createUser({
      username: "resolve_external_outsider",
      email: "resolve_external_outsider@test.com",
      gamerTag: "ResolveExternalOutsider",
    });

    const applicant = await createUser({
      username: "resolve_external_applicant",
      email: "resolve_external_applicant@test.com",
      gamerTag: "ResolveExternalApplicant",
    });

    const club = await createClub({
      name: "Club Resolve External",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si la acción es inválida", async () => {
    const admin = await createUser({
      username: "resolve_invalid_action_admin",
      email: "resolve_invalid_action_admin@test.com",
      gamerTag: "ResolveInvalidActionAdmin",
    });

    const applicant = await createUser({
      username: "resolve_invalid_action_applicant",
      email: "resolve_invalid_action_applicant@test.com",
      gamerTag: "ResolveInvalidActionApplicant",
    });

    const club = await createClub({
      name: "Club Resolve Invalid Action",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "approve" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/acción inválida/i);
  });

  test("debe responder 404 si el club no existe", async () => {
    const admin = await createUser({
      username: "resolve_missing_club_admin",
      email: "resolve_missing_club_admin@test.com",
      gamerTag: "ResolveMissingClubAdmin",
    });

    const applicant = await createUser({
      username: "resolve_missing_club_applicant",
      email: "resolve_missing_club_applicant@test.com",
      gamerTag: "ResolveMissingClubApplicant",
    });

    const token = makeToken(admin._id);
    const fakeClubId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app)
      .put(`/clubs/${fakeClubId}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 404 si la solicitud pending no existe", async () => {
    const admin = await createUser({
      username: "resolve_missing_request_admin",
      email: "resolve_missing_request_admin@test.com",
      gamerTag: "ResolveMissingRequestAdmin",
    });

    const applicant = await createUser({
      username: "resolve_missing_request_applicant",
      email: "resolve_missing_request_applicant@test.com",
      gamerTag: "ResolveMissingRequestApplicant",
    });

    const club = await createClub({
      name: "Club Resolve Missing Request",
      members: [{ user: admin._id, role: "admin" }],
      joinRequests: [],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/solicitud no encontrada/i);
  });

  test("accept no debe duplicar miembro si ya pertenecía al club y sí debe limpiar la request", async () => {
    const admin = await createUser({
      username: "resolve_already_member_admin",
      email: "resolve_already_member_admin@test.com",
      gamerTag: "ResolveAlreadyMemberAdmin",
    });

    const applicant = await createUser({
      username: "resolve_already_member_user",
      email: "resolve_already_member_user@test.com",
      gamerTag: "ResolveAlreadyMemberUser",
    });

    const club = await createClub({
      name: "Club Resolve Already Member",
      members: [
        { user: admin._id, role: "admin" },
        { user: applicant._id, role: "member" },
      ],
      joinRequests: [{ user: applicant._id, status: "pending" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}/join-requests/${applicant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "accept" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/usuario ya era miembro \(ok\)/i);

    const updatedClub = await Club.findById(club._id);
    const sameUserMembers = updatedClub.members.filter(
      (m) => m.user.toString() === applicant._id.toString()
    );
    const pendingRequest = updatedClub.joinRequests.find(
      (r) => r.user.toString() === applicant._id.toString() && r.status === "pending"
    );

    expect(sameUserMembers).toHaveLength(1);
    expect(pendingRequest).toBeUndefined();
  });
});