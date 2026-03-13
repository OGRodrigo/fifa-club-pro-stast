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
  stadium = "Estadio Base",
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

describe("PUT /matches/:id/clubs/:clubId - update match", () => {
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
      username: "match_update_no_token_admin",
      email: "match_update_no_token_admin@test.com",
      gamerTag: "MatchUpdateNoTokenAdmin",
    });

    const homeClub = await createClub({
      name: "Home Update No Token",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update No Token",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .send({
        stadium: "Nuevo Estadio",
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede actualizar stadium, scores, competition y status", async () => {
    const admin = await createUser({
      username: "match_update_admin_ok",
      email: "match_update_admin_ok@test.com",
      gamerTag: "MatchUpdateAdminOK",
    });

    const homeClub = await createClub({
      name: "Home Update OK",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update OK",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      stadium: "Estadio Viejo",
      scoreHome: 1,
      scoreAway: 0,
      competition: "League",
      status: "played",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        stadium: "  Estadio Nuevo  ",
        scoreHome: 3,
        scoreAway: 2,
        competition: "  Cup  ",
        status: "scheduled",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.stadium).toBe("Estadio Nuevo");
    expect(res.body.scoreHome).toBe(3);
    expect(res.body.scoreAway).toBe(2);
    expect(res.body.competition).toBe("Cup");
    expect(res.body.status).toBe("scheduled");

    const updatedMatch = await Match.findById(match._id);
    expect(updatedMatch.stadium).toBe("Estadio Nuevo");
    expect(updatedMatch.scoreHome).toBe(3);
    expect(updatedMatch.scoreAway).toBe(2);
    expect(updatedMatch.competition).toBe("Cup");
    expect(updatedMatch.status).toBe("scheduled");
  });

  test("captain también puede actualizar el partido", async () => {
    const captain = await createUser({
      username: "match_update_captain_ok",
      email: "match_update_captain_ok@test.com",
      gamerTag: "MatchUpdateCaptainOK",
    });

    const homeClub = await createClub({
      name: "Home Update Captain",
      members: [{ user: captain._id, role: "captain" }],
    });

    const awayClub = await createClub({
      name: "Away Update Captain",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      stadium: "Captain Stadium",
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        stadium: "Captain Stadium Updated",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.stadium).toBe("Captain Stadium Updated");
  });

  test("member no puede actualizar partidos", async () => {
    const member = await createUser({
      username: "match_update_member_block",
      email: "match_update_member_block@test.com",
      gamerTag: "MatchUpdateMemberBlock",
    });

    const homeClub = await createClub({
      name: "Home Update Member Block",
      members: [{ user: member._id, role: "member" }],
    });

    const awayClub = await createClub({
      name: "Away Update Member Block",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        stadium: "Should Not Update",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si los IDs son inválidos", async () => {
    const admin = await createUser({
      username: "match_update_invalid_ids_admin",
      email: "match_update_invalid_ids_admin@test.com",
      gamerTag: "MatchUpdateInvalidIdsAdmin",
    });

    const club = await createClub({
      name: "Club Invalid IDs Update",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/id-invalido/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        stadium: "No importa",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ids inválidos/i);
  });

  test("debe responder 404 si el partido no existe", async () => {
    const admin = await createUser({
      username: "match_update_missing_match_admin",
      email: "match_update_missing_match_admin@test.com",
      gamerTag: "MatchUpdateMissingMatchAdmin",
    });

    const club = await createClub({
      name: "Club Missing Match Update",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);
    const fakeMatchId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/matches/${fakeMatchId}/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        stadium: "No Match",
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("debe responder 403 si homeClub inválido deja al club actuante fuera del partido", async () => {
    const admin = await createUser({
      username: "match_update_invalid_home_admin",
      email: "match_update_invalid_home_admin@test.com",
      gamerTag: "MatchUpdateInvalidHomeAdmin",
    });

    const homeClub = await createClub({
      name: "Home Update Invalid Home",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update Invalid Home",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: "id-home-invalido",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tu club no participa en este partido/i);
  });

  test("debe responder 400 si la fecha es inválida", async () => {
    const admin = await createUser({
      username: "match_update_invalid_date_admin",
      email: "match_update_invalid_date_admin@test.com",
      gamerTag: "MatchUpdateInvalidDateAdmin",
    });

    const homeClub = await createClub({
      name: "Home Update Invalid Date",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update Invalid Date",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "fecha-incorrecta",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/fecha inválida/i);
  });

  test("debe actualizar season cuando cambia la fecha", async () => {
    const admin = await createUser({
      username: "match_update_season_admin",
      email: "match_update_season_admin@test.com",
      gamerTag: "MatchUpdateSeasonAdmin",
    });

    const homeClub = await createClub({
      name: "Home Update Season",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update Season",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      date: "2026-01-10T20:00:00.000Z",
      season: 2026,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2027-02-15T20:00:00.000Z",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.season).toBe(2027);

    const updatedMatch = await Match.findById(match._id);
    expect(updatedMatch.season).toBe(2027);
  });

  test("debe responder 400 si homeClub y awayClub quedan iguales", async () => {
    const admin = await createUser({
      username: "match_update_same_clubs_admin",
      email: "match_update_same_clubs_admin@test.com",
      gamerTag: "MatchUpdateSameClubsAdmin",
    });

    const homeClub = await createClub({
      name: "Home Update Same Clubs",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update Same Clubs",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        awayClub: String(homeClub._id),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/no pueden ser el mismo club/i);
  });

  test("debe responder 404 si awayClub no existe", async () => {
    const admin = await createUser({
      username: "match_update_missing_away_admin",
      email: "match_update_missing_away_admin@test.com",
      gamerTag: "MatchUpdateMissingAwayAdmin",
    });

    const homeClub = await createClub({
      name: "Home Update Missing Away",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Update Missing Away",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const fakeAwayClubId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/matches/${match._id}/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        awayClub: fakeAwayClubId,
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/awayClub no encontrado/i);
  });
});