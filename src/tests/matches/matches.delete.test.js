const mongoose = require("mongoose");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const User = require("../../models/User");
const Club = require("../../models/Club");
const Match = require("../../models/Match");

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

async function createMatch({
  homeClub,
  awayClub,
  date = "2026-03-10T20:00:00.000Z",
  stadium = "Estadio Delete",
  scoreHome = 1,
  scoreAway = 0,
  season = 2026,
  competition = "League",
  status = "played",
  playerStats = [],
} = {}) {
  return Match.create({
    homeClub,
    awayClub,
    date: new Date(date),
    stadium,
    scoreHome,
    scoreAway,
    season,
    competition,
    status,
    playerStats,
  });
}

describe("DELETE /matches/:id/clubs/:clubId - delete match", () => {
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
      username: "match_delete_no_token_admin",
      email: "match_delete_no_token_admin@test.com",
      gamerTag: "MatchDeleteNoTokenAdmin",
    });

    const homeClub = await createClub({
      name: "Delete Home No Token",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Delete Away No Token",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const res = await request(app).delete(
      `/matches/${match._id}/clubs/${homeClub._id}`
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin del club participante puede eliminar el partido", async () => {
    const admin = await createUser({
      username: "match_delete_admin_ok",
      email: "match_delete_admin_ok@test.com",
      gamerTag: "MatchDeleteAdminOK",
    });

    const homeClub = await createClub({
      name: "Delete Home OK",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Delete Away OK",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido eliminado correctamente/i);

    const deletedMatch = await Match.findById(match._id);
    expect(deletedMatch).toBeNull();
  });

  test("otro admin del club rival también puede eliminar el partido", async () => {
    const awayAdmin = await createUser({
      username: "match_delete_away_admin_ok",
      email: "match_delete_away_admin_ok@test.com",
      gamerTag: "MatchDeleteAwayAdminOK",
    });

    const homeClub = await createClub({
      name: "Delete Rival Home",
    });

    const awayClub = await createClub({
      name: "Delete Rival Away",
      members: [{ user: awayAdmin._id, role: "admin" }],
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(awayAdmin._id);

    const res = await request(app)
      .delete(`/matches/${match._id}/clubs/${awayClub._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);

    const deletedMatch = await Match.findById(match._id);
    expect(deletedMatch).toBeNull();
  });

  test("captain no puede eliminar el partido porque la ruta permite solo admin", async () => {
    const captain = await createUser({
      username: "match_delete_captain_block",
      email: "match_delete_captain_block@test.com",
      gamerTag: "MatchDeleteCaptainBlock",
    });

    const homeClub = await createClub({
      name: "Delete Captain Home",
      members: [{ user: captain._id, role: "captain" }],
    });

    const awayClub = await createClub({
      name: "Delete Captain Away",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .delete(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const existingMatch = await Match.findById(match._id);
    expect(existingMatch).not.toBeNull();
  });

  test("member no puede eliminar el partido", async () => {
    const member = await createUser({
      username: "match_delete_member_block",
      email: "match_delete_member_block@test.com",
      gamerTag: "MatchDeleteMemberBlock",
    });

    const homeClub = await createClub({
      name: "Delete Member Home",
      members: [{ user: member._id, role: "member" }],
    });

    const awayClub = await createClub({
      name: "Delete Member Away",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .delete(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const existingMatch = await Match.findById(match._id);
    expect(existingMatch).not.toBeNull();
  });

  test("debe responder 400 si los IDs son inválidos", async () => {
    const admin = await createUser({
      username: "match_delete_invalid_ids_admin",
      email: "match_delete_invalid_ids_admin@test.com",
      gamerTag: "MatchDeleteInvalidIdsAdmin",
    });

    const club = await createClub({
      name: "Delete Invalid IDs Club",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/matches/id-invalido/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ids inválidos/i);
  });

  test("debe responder 404 si el partido no existe", async () => {
    const admin = await createUser({
      username: "match_delete_missing_match_admin",
      email: "match_delete_missing_match_admin@test.com",
      gamerTag: "MatchDeleteMissingMatchAdmin",
    });

    const club = await createClub({
      name: "Delete Missing Match Club",
      members: [{ user: admin._id, role: "admin" }],
    });

    const fakeMatchId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/matches/${fakeMatchId}/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("debe responder 403 si el club actuante no participa en el partido", async () => {
    const admin = await createUser({
      username: "match_delete_non_participant_admin",
      email: "match_delete_non_participant_admin@test.com",
      gamerTag: "MatchDeleteNonParticipantAdmin",
    });

    const actingClub = await createClub({
      name: "Delete Acting Outside",
      members: [{ user: admin._id, role: "admin" }],
    });

    const homeClub = await createClub({
      name: "Delete Outside Home",
    });

    const awayClub = await createClub({
      name: "Delete Outside Away",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .delete(`/matches/${match._id}/clubs/${actingClub._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tu club no participa en este partido/i);

    const existingMatch = await Match.findById(match._id);
    expect(existingMatch).not.toBeNull();
  });
});