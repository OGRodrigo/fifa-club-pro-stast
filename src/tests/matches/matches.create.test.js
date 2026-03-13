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

describe("POST /matches/clubs/:clubId - create match", () => {
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
    const homeClub = await createClub({ name: "Home No Token" });
    const awayClub = await createClub({ name: "Away No Token" });

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio Test",
        scoreHome: 0,
        scoreAway: 0,
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin del club actuante puede crear partido válido", async () => {
    const admin = await createUser({
      username: "match_create_admin_ok",
      email: "match_create_admin_ok@test.com",
      gamerTag: "MatchCreateAdminOK",
    });

    const homeClub = await createClub({
      name: "Home Create OK",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Create OK",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-03-10T20:00:00.000Z",
        stadium: "  Estadio Central  ",
        scoreHome: 0,
        scoreAway: 0,
        competition: "  League  ",
        status: "played",
        strictTotals: true,
        playerStats: [],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("homeClub");
    expect(res.body).toHaveProperty("awayClub");
    expect(String(res.body.homeClub._id)).toBe(String(homeClub._id));
    expect(String(res.body.awayClub._id)).toBe(String(awayClub._id));
    expect(res.body.stadium).toBe("Estadio Central");
    expect(res.body.competition).toBe("League");
    expect(res.body.scoreHome).toBe(0);
    expect(res.body.scoreAway).toBe(0);
    expect(res.body.season).toBe(2026);

    const matchInDb = await Match.findById(res.body._id);
    expect(matchInDb).not.toBeNull();
    expect(matchInDb.stadium).toBe("Estadio Central");
    expect(matchInDb.season).toBe(2026);
  });

  test("captain del club actuante también puede crear partido", async () => {
    const captain = await createUser({
      username: "match_create_captain_ok",
      email: "match_create_captain_ok@test.com",
      gamerTag: "MatchCreateCaptainOK",
    });

    const homeClub = await createClub({
      name: "Home Captain Create",
      members: [{ user: captain._id, role: "captain" }],
    });

    const awayClub = await createClub({
      name: "Away Captain Create",
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-04-15T21:00:00.000Z",
        stadium: "Estadio Captain",
        scoreHome: 1,
        scoreAway: 0,
        strictTotals: false,
        playerStats: [],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.scoreHome).toBe(1);
    expect(res.body.scoreAway).toBe(0);
  });

  test("member no puede crear partidos", async () => {
    const member = await createUser({
      username: "match_create_member_block",
      email: "match_create_member_block@test.com",
      gamerTag: "MatchCreateMemberBlock",
    });

    const homeClub = await createClub({
      name: "Home Member Block",
      members: [{ user: member._id, role: "member" }],
    });

    const awayClub = await createClub({
      name: "Away Member Block",
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio Member Block",
        scoreHome: 1,
        scoreAway: 1,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si faltan datos obligatorios", async () => {
    const admin = await createUser({
      username: "match_missing_fields_admin",
      email: "match_missing_fields_admin@test.com",
      gamerTag: "MatchMissingFieldsAdmin",
    });

    const homeClub = await createClub({
      name: "Home Missing Fields",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Missing Fields",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        stadium: "Estadio Incompleto",
        scoreHome: 1,
        scoreAway: 1,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/datos incompletos/i);
  });

  test("debe responder 400 si los IDs de club son inválidos", async () => {
    const admin = await createUser({
      username: "match_invalid_ids_admin",
      email: "match_invalid_ids_admin@test.com",
      gamerTag: "MatchInvalidIdsAdmin",
    });

    const actingClub = await createClub({
      name: "Acting Invalid IDs",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${actingClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: "id-invalido",
        awayClub: "otro-id-invalido",
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio IDs",
        scoreHome: 1,
        scoreAway: 0,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ids de club inválidos/i);
  });

  test("debe responder 400 si homeClub y awayClub son el mismo club", async () => {
    const admin = await createUser({
      username: "match_same_club_admin",
      email: "match_same_club_admin@test.com",
      gamerTag: "MatchSameClubAdmin",
    });

    const club = await createClub({
      name: "Same Club Match",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(club._id),
        awayClub: String(club._id),
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio Same Club",
        scoreHome: 1,
        scoreAway: 1,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/no pueden ser el mismo club/i);
  });

  test("debe responder 403 si el club actuante no participa en el partido", async () => {
    const admin = await createUser({
      username: "match_non_participant_admin",
      email: "match_non_participant_admin@test.com",
      gamerTag: "MatchNonParticipantAdmin",
    });

    const actingClub = await createClub({
      name: "Acting Club Outside Match",
      members: [{ user: admin._id, role: "admin" }],
    });

    const homeClub = await createClub({
      name: "Home Outside Match",
    });

    const awayClub = await createClub({
      name: "Away Outside Match",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${actingClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio Outside",
        scoreHome: 1,
        scoreAway: 0,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tu club no participa en este partido/i);
  });

  test("debe responder 400 si la fecha es inválida", async () => {
    const admin = await createUser({
      username: "match_invalid_date_admin",
      email: "match_invalid_date_admin@test.com",
      gamerTag: "MatchInvalidDateAdmin",
    });

    const homeClub = await createClub({
      name: "Home Invalid Date",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Invalid Date",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "fecha-no-valida",
        stadium: "Estadio Invalid Date",
        scoreHome: 2,
        scoreAway: 1,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/fecha inválida/i);
  });

  test("debe responder 404 si uno de los clubs no existe", async () => {
    const admin = await createUser({
      username: "match_missing_club_admin",
      email: "match_missing_club_admin@test.com",
      gamerTag: "MatchMissingClubAdmin",
    });

    const homeClub = await createClub({
      name: "Home Missing Club",
      members: [{ user: admin._id, role: "admin" }],
    });

    const fakeAwayClubId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: fakeAwayClubId,
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio Missing Club",
        scoreHome: 1,
        scoreAway: 0,
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/club no encontrado/i);
  });

  test("debe responder 400 si playerStats rompe strictTotals", async () => {
    const admin = await createUser({
      username: "match_strict_totals_admin",
      email: "match_strict_totals_admin@test.com",
      gamerTag: "MatchStrictTotalsAdmin",
    });

    const scorer = await createUser({
      username: "match_strict_totals_scorer",
      email: "match_strict_totals_scorer@test.com",
      gamerTag: "MatchStrictTotalsScorer",
    });

    const homeClub = await createClub({
      name: "Home Strict Totals",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "Away Strict Totals",
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-03-10T20:00:00.000Z",
        stadium: "Estadio Strict Totals",
        scoreHome: 2,
        scoreAway: 0,
        strictTotals: true,
        playerStats: [
          {
            user: String(scorer._id),
            club: String(homeClub._id),
            goals: 1,
            assists: 0,
          },
        ],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/no coincide con scoreHome/i);
  });

  test("debe crear partido con lineups y teamStats válidos", async () => {
    const admin = await createUser({
      username: "match_full_payload_admin",
      email: "match_full_payload_admin@test.com",
      gamerTag: "MatchFullPayloadAdmin",
    });

    const homePlayer = await createUser({
      username: "match_home_player_1",
      email: "match_home_player_1@test.com",
      gamerTag: "MatchHomePlayer1",
    });

    const awayPlayer = await createUser({
      username: "match_away_player_1",
      email: "match_away_player_1@test.com",
      gamerTag: "MatchAwayPlayer1",
    });

    const homeClub = await createClub({
      name: "Home Full Payload",
      members: [
        { user: admin._id, role: "admin" },
        { user: homePlayer._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "Away Full Payload",
      members: [{ user: awayPlayer._id, role: "member" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .post(`/matches/clubs/${homeClub._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        homeClub: String(homeClub._id),
        awayClub: String(awayClub._id),
        date: "2026-05-20T20:30:00.000Z",
        stadium: "Estadio Full Payload",
        scoreHome: 1,
        scoreAway: 1,
        strictTotals: true,
        teamStats: {
          home: {
            possession: 55,
            shots: 8,
            shotsOnTarget: 4,
            shotAccuracy: 50,
            passes: 120,
            passesCompleted: 100,
            passAccuracy: 83,
            tackles: 10,
            tacklesWon: 8,
            tackleSuccess: 80,
          },
          away: {
            possession: 45,
            shots: 7,
            shotsOnTarget: 3,
            shotAccuracy: 43,
            passes: 110,
            passesCompleted: 90,
            passAccuracy: 82,
            tackles: 9,
            tacklesWon: 6,
            tackleSuccess: 67,
          },
        },
        lineups: {
          home: {
            formation: "4-3-3",
            players: [
              {
                user: String(homePlayer._id),
                position: "st",
                shirtNumber: 9,
                starter: true,
              },
            ],
          },
          away: {
            formation: "4-4-2",
            players: [
              {
                user: String(awayPlayer._id),
                position: "cb",
                shirtNumber: 4,
                starter: true,
              },
            ],
          },
        },
        playerStats: [
          {
            user: String(homePlayer._id),
            club: String(homeClub._id),
            position: "st",
            goals: 1,
            assists: 0,
            rating: 8.2,
          },
          {
            user: String(awayPlayer._id),
            club: String(awayClub._id),
            position: "cb",
            goals: 1,
            assists: 0,
            rating: 7.5,
          },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.teamStats.home.possession).toBe(55);
    expect(res.body.teamStats.away.possession).toBe(45);
    expect(res.body.lineups.home.formation).toBe("4-3-3");
    expect(res.body.lineups.away.formation).toBe("4-4-2");
    expect(Array.isArray(res.body.playerStats)).toBe(true);
    expect(res.body.playerStats).toHaveLength(2);

    const matchInDb = await Match.findById(res.body._id);
    expect(matchInDb).not.toBeNull();
    expect(matchInDb.teamStats.home.shots).toBe(8);
    expect(matchInDb.lineups.home.players).toHaveLength(1);
    expect(matchInDb.playerStats).toHaveLength(2);
  });
});