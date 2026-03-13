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
  members = [],
  joinRequests = [],
} = {}) {
  return Club.create({
    name,
    country,
    members,
    joinRequests,
  });
}

async function createMatch({
  homeClub,
  awayClub,
  date = new Date("2026-03-10T20:00:00.000Z"),
  stadium = "Estadio Test",
  scoreHome = 2,
  scoreAway = 1,
  season = 2026,
  playerStats = [],
} = {}) {
  return Match.create({
    homeClub,
    awayClub,
    date,
    stadium,
    scoreHome,
    scoreAway,
    season,
    playerStats,
  });
}

describe("GET /clubs - lectura y rutas protegidas", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  test("GET /clubs/:id debe devolver un club existente", async () => {
    const club = await createClub({
      name: "Club Público",
      country: "Chile",
    });

    const res = await request(app).get(`/clubs/${club._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(String(res.body._id)).toBe(String(club._id));
    expect(res.body.name).toBe("Club Público");
    expect(res.body.country).toBe("Chile");
  });

  test("GET /clubs/:id debe devolver 404 si el club no existe", async () => {
    const fakeId = "67c9c2d5d8d4b0198c77f111";

    const res = await request(app).get(`/clubs/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/club no encontrado/i);
  });

  test("GET /clubs/:id debe devolver 400 si el id es inválido", async () => {
    const res = await request(app).get("/clubs/id-invalido");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/id inválido/i);
  });

  test("GET /clubs/:clubId/dashboard debe bloquear sin token", async () => {
    const club = await createClub({
      name: "Club Dashboard",
      country: "Chile",
    });

    const res = await request(app).get(`/clubs/${club._id}/dashboard`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("GET /clubs/:clubId/dashboard debe permitir a un member del club", async () => {
    const user = await createUser({
      username: "memberdash",
      email: "memberdash@test.com",
      gamerTag: "MemberDash",
    });

    const club = await createClub({
      name: "Club Dashboard",
      country: "Chile",
      members: [{ user: user._id, role: "member" }],
    });

    const token = makeToken(user._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/dashboard`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("club");
    expect(res.body).toHaveProperty("members");
    expect(res.body.club.name).toBe("Club Dashboard");
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members).toHaveLength(1);
  });

  test("GET /clubs/:clubId/dashboard debe rechazar a usuario fuera del club", async () => {
    const outsider = await createUser({
      username: "outsiderdash",
      email: "outsiderdash@test.com",
      gamerTag: "OutsiderDash",
    });

    const owner = await createUser({
      username: "ownerdash",
      email: "ownerdash@test.com",
      gamerTag: "OwnerDash",
    });

    const club = await createClub({
      name: "Club Dashboard",
      country: "Chile",
      members: [{ user: owner._id, role: "admin" }],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .get(`/clubs/${club._id}/dashboard`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/no perteneces a este club/i);
  });

  test("GET /clubs/:clubId/form debe devolver últimos partidos del club", async () => {
    const user = await createUser({
      username: "memberform",
      email: "memberform@test.com",
      gamerTag: "MemberForm",
    });

    const clubA = await createClub({
      name: "Club A",
      country: "Chile",
      members: [{ user: user._id, role: "member" }],
    });

    const clubB = await createClub({
      name: "Club B",
      country: "Argentina",
    });

    const token = makeToken(user._id);

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: new Date("2026-03-01T20:00:00.000Z"),
      stadium: "Estadio 1",
      scoreHome: 1,
      scoreAway: 0,
      season: 2026,
    });

    await createMatch({
      homeClub: clubB._id,
      awayClub: clubA._id,
      date: new Date("2026-03-05T20:00:00.000Z"),
      stadium: "Estadio 2",
      scoreHome: 2,
      scoreAway: 2,
      season: 2026,
    });

    const res = await request(app)
      .get(`/clubs/${clubA._id}/form`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    // orden descendente por fecha
    expect(new Date(res.body[0].date).getTime())
      .toBeGreaterThan(new Date(res.body[1].date).getTime());
  });

  test("GET /clubs/:clubAId/vs/:clubBId debe devolver enfrentamientos si el usuario pertenece a uno de los clubs", async () => {
    const user = await createUser({
      username: "memberh2h",
      email: "memberh2h@test.com",
      gamerTag: "MemberH2H",
    });

    const clubA = await createClub({
      name: "Club A",
      country: "Chile",
      members: [{ user: user._id, role: "member" }],
    });

    const clubB = await createClub({
      name: "Club B",
      country: "Argentina",
    });

    const clubC = await createClub({
      name: "Club C",
      country: "Perú",
    });

    const token = makeToken(user._id);

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubB._id,
      date: new Date("2026-03-01T20:00:00.000Z"),
      stadium: "Estadio 1",
      scoreHome: 1,
      scoreAway: 0,
      season: 2026,
    });

    await createMatch({
      homeClub: clubB._id,
      awayClub: clubA._id,
      date: new Date("2026-03-05T20:00:00.000Z"),
      stadium: "Estadio 2",
      scoreHome: 2,
      scoreAway: 2,
      season: 2026,
    });

    await createMatch({
      homeClub: clubA._id,
      awayClub: clubC._id,
      date: new Date("2026-03-07T20:00:00.000Z"),
      stadium: "Estadio 3",
      scoreHome: 3,
      scoreAway: 1,
      season: 2026,
    });

    const res = await request(app)
      .get(`/clubs/${clubA._id}/vs/${clubB._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test("GET /clubs/:clubAId/vs/:clubBId debe rechazar si el usuario no pertenece ni a A ni a B", async () => {
    const outsider = await createUser({
      username: "outsiderh2h",
      email: "outsiderh2h@test.com",
      gamerTag: "OutsiderH2H",
    });

    const clubA = await createClub({
      name: "Club A",
      country: "Chile",
    });

    const clubB = await createClub({
      name: "Club B",
      country: "Argentina",
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .get(`/clubs/${clubA._id}/vs/${clubB._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });
});