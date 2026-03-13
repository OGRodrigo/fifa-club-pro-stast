const mongoose = require("mongoose");
const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../app");
const User = require("../../models/User");
const Club = require("../../models/Club");
const Match = require("../../models/Match");

const {
  connectTestDB,
  clearTestDB,
  closeTestDB,
} = require("../setup/testDb");

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
  stadium = "Estadio Read",
  scoreHome = 1,
  scoreAway = 0,
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

describe("GET /matches - read flows", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  test("GET /matches debe listar partidos paginados", async () => {
    const clubA = await createClub({ name: "Read Club A" });
    const clubB = await createClub({ name: "Read Club B" });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: "2026-03-01T20:00:00.000Z",
      stadium: "Estadio 1",
      scoreHome: 1,
      scoreAway: 0,
      season: 2026,
    });

    await createMatch({
      homeClub: clubB._id,
      awayClub: clubA._id,
      date: "2026-03-05T20:00:00.000Z",
      stadium: "Estadio 2",
      scoreHome: 2,
      scoreAway: 2,
      season: 2026,
    });

    const res = await request(app).get("/matches?page=1&limit=10");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("limit", 10);
    expect(res.body).toHaveProperty("totalMatches", 2);
    expect(res.body).toHaveProperty("totalPages", 1);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  test("GET /matches debe filtrar por season", async () => {
    const clubA = await createClub({ name: "Season Club A" });
    const clubB = await createClub({ name: "Season Club B" });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: "2026-03-01T20:00:00.000Z",
      season: 2026,
    });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: "2027-03-01T20:00:00.000Z",
      season: 2027,
    });

    const res = await request(app).get("/matches?season=2026");

    expect(res.statusCode).toBe(200);
    expect(res.body.totalMatches).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].season).toBe(2026);
  });

  test("GET /matches debe filtrar por club", async () => {
    const clubA = await createClub({ name: "Club Filter A" });
    const clubB = await createClub({ name: "Club Filter B" });
    const clubC = await createClub({ name: "Club Filter C" });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      season: 2026,
    });

    await createMatch({
      homeClub: clubC._id,
      awayClub: clubB._id,
      season: 2026,
    });

    const res = await request(app).get(`/matches?club=${clubA._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalMatches).toBe(1);
    expect(res.body.data).toHaveLength(1);
  });

  test("GET /matches debe responder 400 si season es inválida", async () => {
    const res = await request(app).get("/matches?season=abc");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/season inválida/i);
  });

  test("GET /matches debe responder 400 si page es inválida", async () => {
    const res = await request(app).get("/matches?page=0&limit=10");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/page inválida/i);
  });

  test("GET /matches debe responder 400 si limit es inválido", async () => {
    const res = await request(app).get("/matches?page=1&limit=0");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/limit inválido/i);
  });

  test("GET /matches/:id debe devolver un partido existente", async () => {
    const clubA = await createClub({ name: "GetById Club A" });
    const clubB = await createClub({ name: "GetById Club B" });

    const match = await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      stadium: "Estadio GetById",
      scoreHome: 3,
      scoreAway: 1,
    });

    const res = await request(app).get(`/matches/${match._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(String(res.body._id)).toBe(String(match._id));
    expect(res.body.stadium).toBe("Estadio GetById");
    expect(res.body.scoreHome).toBe(3);
    expect(res.body.scoreAway).toBe(1);
  });

  test("GET /matches/:id debe responder 404 si no existe", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app).get(`/matches/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("GET /matches/:id debe responder 400 si el id es inválido", async () => {
    const res = await request(app).get("/matches/id-invalido");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/id de partido inválido/i);
  });

  test("GET /matches/:id/full debe devolver partido con poblados", async () => {
    const user1 = await createUser({
      username: "full_user_1",
      email: "full_user_1@test.com",
      gamerTag: "FullUser1",
    });

    const user2 = await createUser({
      username: "full_user_2",
      email: "full_user_2@test.com",
      gamerTag: "FullUser2",
    });

    const clubA = await createClub({
      name: "Full Club A",
      members: [{ user: user1._id, role: "member" }],
    });

    const clubB = await createClub({
      name: "Full Club B",
      members: [{ user: user2._id, role: "member" }],
    });

    const match = await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      lineups: {
        home: {
          formation: "4-3-3",
          players: [
            {
              user: user1._id,
              position: "ST",
              shirtNumber: 9,
              starter: true,
            },
          ],
        },
        away: {
          formation: "4-4-2",
          players: [
            {
              user: user2._id,
              position: "CB",
              shirtNumber: 4,
              starter: true,
            },
          ],
        },
      },
      playerStats: [
        {
          user: user1._id,
          club: clubA._id,
          goals: 1,
          assists: 0,
          rating: 8,
        },
      ],
    });

    const res = await request(app).get(`/matches/${match._id}/full`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.homeClub).toHaveProperty("name", "Full Club A");
    expect(res.body.awayClub).toHaveProperty("name", "Full Club B");
    expect(Array.isArray(res.body.playerStats)).toBe(true);
    expect(res.body.lineups.home.players[0].user).toHaveProperty("username");
  });

  test("GET /matches/:id/full debe responder 400 si el id es inválido", async () => {
    const res = await request(app).get("/matches/id-invalido/full");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/id de partido inválido/i);
  });

  test("GET /matches/:id/full debe responder 404 si no existe", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app).get(`/matches/${fakeId}/full`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("GET /matches/:id/mvp debe devolver mvp explícito si existe", async () => {
    const user1 = await createUser({
      username: "mvp_explicit_1",
      email: "mvp_explicit_1@test.com",
      gamerTag: "MvpExplicit1",
    });

    const user2 = await createUser({
      username: "mvp_explicit_2",
      email: "mvp_explicit_2@test.com",
      gamerTag: "MvpExplicit2",
    });

    const clubA = await createClub({ name: "MVP Explicit A" });
    const clubB = await createClub({ name: "MVP Explicit B" });

    const match = await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      scoreHome: 2,
      scoreAway: 1,
      playerStats: [
        {
          user: user1._id,
          club: clubA._id,
          goals: 1,
          assists: 1,
          rating: 8.5,
          isMVP: true,
        },
        {
          user: user2._id,
          club: clubB._id,
          goals: 1,
          assists: 0,
          rating: 7.0,
        },
      ],
    });

    const res = await request(app).get(`/matches/${match._id}/mvp`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("mvp");
    expect(res.body.mvp).toHaveProperty("username", "mvp_explicit_1");
  });

  test("GET /matches/:id/mvp debe calcular mvp si no hay explícito", async () => {
    const user1 = await createUser({
      username: "mvp_calc_1",
      email: "mvp_calc_1@test.com",
      gamerTag: "MvpCalc1",
    });

    const user2 = await createUser({
      username: "mvp_calc_2",
      email: "mvp_calc_2@test.com",
      gamerTag: "MvpCalc2",
    });

    const clubA = await createClub({ name: "MVP Calc A" });
    const clubB = await createClub({ name: "MVP Calc B" });

    const match = await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      scoreHome: 2,
      scoreAway: 1,
      playerStats: [
        {
          user: user1._id,
          club: clubA._id,
          goals: 2,
          assists: 0,
          rating: 8.0,
        },
        {
          user: user2._id,
          club: clubB._id,
          goals: 1,
          assists: 0,
          rating: 7.5,
        },
      ],
    });

    const res = await request(app).get(`/matches/${match._id}/mvp`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("mvp");
    expect(res.body.mvp).toHaveProperty("username", "mvp_calc_1");
  });

  test("GET /matches/:id/mvp debe devolver mvp null si no hay playerStats", async () => {
    const clubA = await createClub({ name: "MVP Empty A" });
    const clubB = await createClub({ name: "MVP Empty B" });

    const match = await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      playerStats: [],
    });

    const res = await request(app).get(`/matches/${match._id}/mvp`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("mvp", null);
  });

  test("GET /matches/calendar debe filtrar por season", async () => {
    const clubA = await createClub({ name: "Calendar A" });
    const clubB = await createClub({ name: "Calendar B" });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: "2026-01-10T20:00:00.000Z",
      season: 2026,
    });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: "2027-01-10T20:00:00.000Z",
      season: 2027,
    });

    const res = await request(app).get("/matches/calendar?season=2026");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("season", 2026);
    expect(res.body).toHaveProperty("total", 1);
    expect(res.body.data).toHaveLength(1);
  });

  test("GET /matches/calendar debe responder 400 si season es inválida", async () => {
    const res = await request(app).get("/matches/calendar?season=hola");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/season inválida/i);
  });

  test("GET /matches/h2h/:clubA/:clubB debe devolver resumen head to head", async () => {
    const clubA = await createClub({ name: "H2H Club A" });
    const clubB = await createClub({ name: "H2H Club B" });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      scoreHome: 2,
      scoreAway: 1,
      date: "2026-01-10T20:00:00.000Z",
      season: 2026,
    });

    await createMatch({
      homeClub: clubB._id,
      awayClub: clubA._id,
      scoreHome: 0,
      scoreAway: 0,
      date: "2026-02-10T20:00:00.000Z",
      season: 2026,
    });

    const res = await request(app).get(
      `/matches/h2h/${clubA._id}/${clubB._id}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("played", 2);
    expect(res.body).toHaveProperty("winsA", 1);
    expect(res.body).toHaveProperty("winsB", 0);
    expect(res.body).toHaveProperty("draws", 1);
    expect(res.body).toHaveProperty("goalsA", 2);
    expect(res.body).toHaveProperty("goalsB", 1);
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.matches).toHaveLength(2);
  });
});