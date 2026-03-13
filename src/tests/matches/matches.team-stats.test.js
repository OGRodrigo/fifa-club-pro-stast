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
  stadium = "Estadio Team Stats",
  scoreHome = 2,
  scoreAway = 1,
  season = 2026,
  competition = "League",
  status = "played",
  teamStats = {},
  lineups = {},
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
    teamStats,
    lineups,
    playerStats,
  });
}

describe("PATCH /matches/:id/clubs/:clubId/team-stats - update team stats", () => {
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
      username: "ts_no_token_admin",
      email: "ts_no_token_admin@test.com",
      gamerTag: "TSNoTokenAdmin",
    });

    const homeClub = await createClub({
      name: "TS Home No Token",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "TS Away No Token",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .send({
        teamStats: {
          home: { possession: 55 },
          away: { possession: 45 },
        },
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede actualizar teamStats", async () => {
    const admin = await createUser({
      username: "ts_admin_ok",
      email: "ts_admin_ok@test.com",
      gamerTag: "TSAdminOK",
    });

    const homeClub = await createClub({
      name: "TS Home Admin OK",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "TS Away Admin OK",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const payload = {
      teamStats: {
        home: {
          possession: 58,
          shots: 10,
          shotsOnTarget: 6,
          shotAccuracy: 60,
          expectedGoals: 2.4,
          passes: 150,
          passesCompleted: 120,
          passAccuracy: 80,
          dribbleSuccess: 70,
          tackles: 12,
          tacklesWon: 9,
          tackleSuccess: 75,
          recoveries: 15,
          interceptions: 7,
          clearances: 4,
          blocks: 2,
          saves: 1,
          fouls: 3,
          offsides: 1,
          corners: 5,
          freeKicks: 2,
          penalties: 0,
          yellowCards: 1,
          redCards: 0,
        },
        away: {
          possession: 42,
          shots: 8,
          shotsOnTarget: 3,
          shotAccuracy: 38,
          expectedGoals: 1.1,
          passes: 120,
          passesCompleted: 90,
          passAccuracy: 75,
          dribbleSuccess: 55,
          tackles: 11,
          tacklesWon: 8,
          tackleSuccess: 73,
          recoveries: 13,
          interceptions: 6,
          clearances: 9,
          blocks: 3,
          saves: 4,
          fouls: 5,
          offsides: 2,
          corners: 3,
          freeKicks: 1,
          penalties: 0,
          yellowCards: 2,
          redCards: 0,
        },
      },
    };

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/teamStats actualizados/i);
    expect(res.body).toHaveProperty("teamStats");
    expect(res.body.teamStats.home.possession).toBe(58);
    expect(res.body.teamStats.away.possession).toBe(42);

    const updatedMatch = await Match.findById(match._id);
    expect(updatedMatch.teamStats.home.shots).toBe(10);
    expect(updatedMatch.teamStats.away.shots).toBe(8);
  });

  test("captain también puede actualizar teamStats", async () => {
    const captain = await createUser({
      username: "ts_captain_ok",
      email: "ts_captain_ok@test.com",
      gamerTag: "TSCaptainOK",
    });

    const homeClub = await createClub({
      name: "TS Home Captain OK",
      members: [{ user: captain._id, role: "captain" }],
    });

    const awayClub = await createClub({
      name: "TS Away Captain OK",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: { possession: 50, shots: 5, shotsOnTarget: 2, shotAccuracy: 40 },
          away: { possession: 50, shots: 5, shotsOnTarget: 2, shotAccuracy: 40 },
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("member no puede actualizar teamStats", async () => {
    const member = await createUser({
      username: "ts_member_block",
      email: "ts_member_block@test.com",
      gamerTag: "TSMemberBlock",
    });

    const homeClub = await createClub({
      name: "TS Home Member Block",
      members: [{ user: member._id, role: "member" }],
    });

    const awayClub = await createClub({
      name: "TS Away Member Block",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: { possession: 60 },
          away: { possession: 40 },
        },
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si los IDs son inválidos", async () => {
    const admin = await createUser({
      username: "ts_invalid_ids_admin",
      email: "ts_invalid_ids_admin@test.com",
      gamerTag: "TSInvalidIdsAdmin",
    });

    const club = await createClub({
      name: "TS Club Invalid IDs",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/id-invalido/clubs/${club._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: { possession: 50 },
          away: { possession: 50 },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ids inválidos/i);
  });

  test("debe responder 404 si el partido no existe", async () => {
    const admin = await createUser({
      username: "ts_missing_match_admin",
      email: "ts_missing_match_admin@test.com",
      gamerTag: "TSMissingMatchAdmin",
    });

    const club = await createClub({
      name: "TS Club Missing Match",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);
    const fakeMatchId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/matches/${fakeMatchId}/clubs/${club._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: { possession: 50 },
          away: { possession: 50 },
        },
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("debe responder 403 si el club actuante no participa en el partido", async () => {
    const admin = await createUser({
      username: "ts_non_participant_admin",
      email: "ts_non_participant_admin@test.com",
      gamerTag: "TSNonParticipantAdmin",
    });

    const actingClub = await createClub({
      name: "TS Acting Outside",
      members: [{ user: admin._id, role: "admin" }],
    });

    const homeClub = await createClub({ name: "TS Home Outside" });
    const awayClub = await createClub({ name: "TS Away Outside" });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${actingClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: { possession: 50 },
          away: { possession: 50 },
        },
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tu club no participa en este partido/i);
  });

  test("debe responder 400 si possession está fuera de rango", async () => {
    const admin = await createUser({
      username: "ts_invalid_percent_admin",
      email: "ts_invalid_percent_admin@test.com",
      gamerTag: "TSInvalidPercentAdmin",
    });

    const homeClub = await createClub({
      name: "TS Home Invalid Percent",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "TS Away Invalid Percent",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: { possession: 120 },
          away: { possession: 40 },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/debe estar entre 0 y 100/i);
  });

  test("debe responder 400 si shotsOnTarget excede shots", async () => {
    const admin = await createUser({
      username: "ts_invalid_shots_admin",
      email: "ts_invalid_shots_admin@test.com",
      gamerTag: "TSInvalidShotsAdmin",
    });

    const homeClub = await createClub({
      name: "TS Home Invalid Shots",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "TS Away Invalid Shots",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: {
            possession: 55,
            shots: 2,
            shotsOnTarget: 3,
            shotAccuracy: 80,
          },
          away: {
            possession: 45,
            shots: 4,
            shotsOnTarget: 2,
            shotAccuracy: 50,
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/shotsOnTarget no puede exceder shots/i);
  });

  test("debe responder 400 si passesCompleted excede passes", async () => {
    const admin = await createUser({
      username: "ts_invalid_passes_admin",
      email: "ts_invalid_passes_admin@test.com",
      gamerTag: "TSInvalidPassesAdmin",
    });

    const homeClub = await createClub({
      name: "TS Home Invalid Passes",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "TS Away Invalid Passes",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: {
            possession: 50,
            passes: 10,
            passesCompleted: 11,
            passAccuracy: 90,
          },
          away: {
            possession: 50,
            passes: 10,
            passesCompleted: 8,
            passAccuracy: 80,
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/passesCompleted no puede exceder passes/i);
  });

  test("debe responder 400 si un campo numérico es negativo", async () => {
    const admin = await createUser({
      username: "ts_negative_admin",
      email: "ts_negative_admin@test.com",
      gamerTag: "TSNegativeAdmin",
    });

    const homeClub = await createClub({
      name: "TS Home Negative",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "TS Away Negative",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/team-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        teamStats: {
          home: {
            possession: 50,
            shots: -1,
            shotsOnTarget: 0,
            shotAccuracy: 0,
          },
          away: {
            possession: 50,
            shots: 1,
            shotsOnTarget: 0,
            shotAccuracy: 0,
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/inválido/i);
  });
});