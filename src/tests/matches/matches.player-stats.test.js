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
  scoreHome = 2,
  scoreAway = 1,
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

describe("PATCH /matches/:id/clubs/:clubId/player-stats - update match player stats", () => {
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
      username: "ps_no_token_admin",
      email: "ps_no_token_admin@test.com",
      gamerTag: "PSNoTokenAdmin",
    });

    const homeClub = await createClub({
      name: "PS Home No Token",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "PS Away No Token",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const res = await request(app).patch(
      `/matches/${match._id}/clubs/${homeClub._id}/player-stats`
    ).send({
      playerStats: [],
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede actualizar playerStats de su club", async () => {
    const admin = await createUser({
      username: "ps_admin_ok",
      email: "ps_admin_ok@test.com",
      gamerTag: "PSAdminOK",
    });

    const scorer = await createUser({
      username: "ps_home_scorer",
      email: "ps_home_scorer@test.com",
      gamerTag: "PSHomeScorer",
    });

    const assister = await createUser({
      username: "ps_home_assister",
      email: "ps_home_assister@test.com",
      gamerTag: "PSHomeAssister",
    });

    const awayPlayer = await createUser({
      username: "ps_away_existing",
      email: "ps_away_existing@test.com",
      gamerTag: "PSAwayExisting",
    });

    const homeClub = await createClub({
      name: "PS Home Admin OK",
      members: [
        { user: admin._id, role: "admin" },
        { user: scorer._id, role: "member" },
        { user: assister._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Admin OK",
      members: [{ user: awayPlayer._id, role: "member" }],
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 2,
      scoreAway: 1,
      playerStats: [
        {
          user: awayPlayer._id,
          club: awayClub._id,
          goals: 1,
          assists: 0,
          rating: 7.2,
        },
      ],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: true,
        playerStats: [
          {
            user: String(scorer._id),
            goals: 1,
            assists: 1,
            position: "st",
            rating: 8.5,
            shots: 3,
            shotsOnTarget: 2,
            passes: 10,
            passesCompleted: 8,
            dribbles: 2,
            dribblesWon: 1,
            tackles: 1,
            tacklesWon: 1,
          },
          {
            user: String(assister._id),
            goals: 1,
            assists: 0,
            position: "cam",
            rating: 8.0,
            shots: 2,
            shotsOnTarget: 1,
            passes: 20,
            passesCompleted: 15,
            dribbles: 1,
            dribblesWon: 1,
            tackles: 0,
            tacklesWon: 0,
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/playerStats actualizados/i);
    expect(res.body).toHaveProperty("clubUpdated", String(homeClub._id));
    expect(res.body).toHaveProperty("match");

    const updatedMatch = await Match.findById(match._id);
    expect(updatedMatch.playerStats).toHaveLength(3);

    const homeStats = updatedMatch.playerStats.filter(
      (ps) => String(ps.club) === String(homeClub._id)
    );
    const awayStats = updatedMatch.playerStats.filter(
      (ps) => String(ps.club) === String(awayClub._id)
    );

    expect(homeStats).toHaveLength(2);
    expect(awayStats).toHaveLength(1);

    const scorerStat = homeStats.find(
      (ps) => String(ps.user) === String(scorer._id)
    );
    expect(scorerStat).toBeTruthy();
    expect(scorerStat.goals).toBe(1);
    expect(scorerStat.assists).toBe(1);
    expect(scorerStat.position).toBe("ST");
  });

  test("captain también puede actualizar playerStats", async () => {
    const captain = await createUser({
      username: "ps_captain_ok",
      email: "ps_captain_ok@test.com",
      gamerTag: "PSCaptainOK",
    });

    const scorer = await createUser({
      username: "ps_captain_scorer",
      email: "ps_captain_scorer@test.com",
      gamerTag: "PSCaptainScorer",
    });

    const homeClub = await createClub({
      name: "PS Home Captain OK",
      members: [
        { user: captain._id, role: "captain" },
        { user: scorer._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Captain OK",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 1,
      scoreAway: 0,
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: true,
        playerStats: [
          {
            user: String(scorer._id),
            goals: 1,
            assists: 0,
            rating: 8.1,
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("member no puede actualizar playerStats", async () => {
    const member = await createUser({
      username: "ps_member_block",
      email: "ps_member_block@test.com",
      gamerTag: "PSMemberBlock",
    });

    const scorer = await createUser({
      username: "ps_member_block_scorer",
      email: "ps_member_block_scorer@test.com",
      gamerTag: "PSMemberBlockScorer",
    });

    const homeClub = await createClub({
      name: "PS Home Member Block",
      members: [
        { user: member._id, role: "member" },
        { user: scorer._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Member Block",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 1,
      scoreAway: 0,
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        playerStats: [
          {
            user: String(scorer._id),
            goals: 1,
            assists: 0,
          },
        ],
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si los IDs son inválidos", async () => {
    const admin = await createUser({
      username: "ps_invalid_ids_admin",
      email: "ps_invalid_ids_admin@test.com",
      gamerTag: "PSInvalidIdsAdmin",
    });

    const club = await createClub({
      name: "PS Club Invalid IDs",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/id-invalido/clubs/${club._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        playerStats: [],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ids inválidos/i);
  });

  test("debe responder 404 si el partido no existe", async () => {
    const admin = await createUser({
      username: "ps_missing_match_admin",
      email: "ps_missing_match_admin@test.com",
      gamerTag: "PSMissingMatchAdmin",
    });

    const club = await createClub({
      name: "PS Club Missing Match",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);
    const fakeMatchId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/matches/${fakeMatchId}/clubs/${club._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        playerStats: [],
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("debe responder 403 si el club actuante no participa en el partido", async () => {
    const admin = await createUser({
      username: "ps_non_participant_admin",
      email: "ps_non_participant_admin@test.com",
      gamerTag: "PSNonParticipantAdmin",
    });

    const actingClub = await createClub({
      name: "PS Acting Club Outside",
      members: [{ user: admin._id, role: "admin" }],
    });

    const homeClub = await createClub({ name: "PS Home Outside" });
    const awayClub = await createClub({ name: "PS Away Outside" });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${actingClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        playerStats: [],
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tu club no participa en este partido/i);
  });

  test("debe responder 400 si playerStats no es array", async () => {
    const admin = await createUser({
      username: "ps_not_array_admin",
      email: "ps_not_array_admin@test.com",
      gamerTag: "PSNotArrayAdmin",
    });

    const homePlayer = await createUser({
      username: "ps_not_array_player",
      email: "ps_not_array_player@test.com",
      gamerTag: "PSNotArrayPlayer",
    });

    const homeClub = await createClub({
      name: "PS Home Not Array",
      members: [
        { user: admin._id, role: "admin" },
        { user: homePlayer._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Not Array",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        playerStats: { user: String(homePlayer._id), goals: 1 },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/playerStats debe ser un array/i);
  });

  test("debe responder 400 si hay jugador duplicado para el mismo club", async () => {
    const admin = await createUser({
      username: "ps_duplicate_admin",
      email: "ps_duplicate_admin@test.com",
      gamerTag: "PSDuplicateAdmin",
    });

    const player = await createUser({
      username: "ps_duplicate_player",
      email: "ps_duplicate_player@test.com",
      gamerTag: "PSDuplicatePlayer",
    });

    const homeClub = await createClub({
      name: "PS Home Duplicate",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Duplicate",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 2,
      scoreAway: 0,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: false,
        playerStats: [
          {
            user: String(player._id),
            goals: 1,
            assists: 0,
          },
          {
            user: String(player._id),
            goals: 1,
            assists: 0,
          },
        ],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/jugador duplicado/i);
  });

  test("debe responder 400 si shotsOnTarget excede shots", async () => {
    const admin = await createUser({
      username: "ps_shots_admin",
      email: "ps_shots_admin@test.com",
      gamerTag: "PSShotsAdmin",
    });

    const player = await createUser({
      username: "ps_shots_player",
      email: "ps_shots_player@test.com",
      gamerTag: "PSShotsPlayer",
    });

    const homeClub = await createClub({
      name: "PS Home Shots",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Shots",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 1,
      scoreAway: 0,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: false,
        playerStats: [
          {
            user: String(player._id),
            goals: 1,
            assists: 0,
            shots: 1,
            shotsOnTarget: 2,
          },
        ],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/shotsOnTarget no puede exceder shots/i);
  });

  test("debe responder 400 si hay más de un MVP", async () => {
    const admin = await createUser({
      username: "ps_multi_mvp_admin",
      email: "ps_multi_mvp_admin@test.com",
      gamerTag: "PSMultiMvpAdmin",
    });

    const player1 = await createUser({
      username: "ps_multi_mvp_player1",
      email: "ps_multi_mvp_player1@test.com",
      gamerTag: "PSMultiMvpPlayer1",
    });

    const player2 = await createUser({
      username: "ps_multi_mvp_player2",
      email: "ps_multi_mvp_player2@test.com",
      gamerTag: "PSMultiMvpPlayer2",
    });

    const homeClub = await createClub({
      name: "PS Home Multi MVP",
      members: [
        { user: admin._id, role: "admin" },
        { user: player1._id, role: "member" },
        { user: player2._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Multi MVP",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 2,
      scoreAway: 0,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: true,
        playerStats: [
          {
            user: String(player1._id),
            goals: 1,
            assists: 0,
            isMVP: true,
          },
          {
            user: String(player2._id),
            goals: 1,
            assists: 0,
            isMVP: true,
          },
        ],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/solo puede haber un mvp/i);
  });

  test("debe responder 400 si strictTotals=true y los goles no coinciden con score del club", async () => {
    const admin = await createUser({
      username: "ps_strict_admin",
      email: "ps_strict_admin@test.com",
      gamerTag: "PSStrictAdmin",
    });

    const player = await createUser({
      username: "ps_strict_player",
      email: "ps_strict_player@test.com",
      gamerTag: "PSStrictPlayer",
    });

    const homeClub = await createClub({
      name: "PS Home Strict",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Strict",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 2,
      scoreAway: 0,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: true,
        playerStats: [
          {
            user: String(player._id),
            goals: 1,
            assists: 0,
          },
        ],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/no coincide con scoreHome/i);
  });

  test("debe permitir strictTotals=false aunque los goles no coincidan exactamente", async () => {
    const admin = await createUser({
      username: "ps_non_strict_admin",
      email: "ps_non_strict_admin@test.com",
      gamerTag: "PSNonStrictAdmin",
    });

    const player = await createUser({
      username: "ps_non_strict_player",
      email: "ps_non_strict_player@test.com",
      gamerTag: "PSNonStrictPlayer",
    });

    const homeClub = await createClub({
      name: "PS Home Non Strict",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "PS Away Non Strict",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      scoreHome: 3,
      scoreAway: 0,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/player-stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        strictTotals: false,
        playerStats: [
          {
            user: String(player._id),
            goals: 1,
            assists: 0,
            rating: 7.9,
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});