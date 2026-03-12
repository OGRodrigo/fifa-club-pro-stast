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

function signToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function createUser({
  username = "user_test",
  email = "user_test@mail.com",
  password = "123456",
  gamerTag = "gamer_test",
  platform = "PS",
  country = "Chile",
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

describe("POST /clubs - casos extra", () => {
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
    const res = await request(app).post("/clubs").send({
      name: "Club Sin Token",
      country: "Chile",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("debe rechazar si faltan name y/o country", async () => {
    const user = await createUser({
      username: "faltacampos",
      email: "faltacampos@mail.com",
      gamerTag: "FaltaCampos",
    });

    const token = signToken(user._id);

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
        country: "",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/name y country son obligatorios/i);
  });

  test("debe rechazar si el usuario ya pertenece a un club", async () => {
    const user = await createUser({
      username: "yaenclub",
      email: "yaenclub@mail.com",
      gamerTag: "YaEnClub",
    });

    const token = signToken(user._id);

    await Club.create({
      name: "Club Original",
      country: "Chile",
      members: [{ user: user._id, role: "admin" }],
      joinRequests: [],
    });

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Club Nuevo",
        country: "Argentina",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ya perteneces a un club/i);
  });

  test("debe rechazar nombre de club duplicado", async () => {
    const user1 = await createUser({
      username: "owner1",
      email: "owner1@mail.com",
      gamerTag: "Owner1",
    });

    const user2 = await createUser({
      username: "owner2",
      email: "owner2@mail.com",
      gamerTag: "Owner2",
    });

    await Club.create({
      name: "Club Duplicado",
      country: "Chile",
      members: [{ user: user1._id, role: "admin" }],
      joinRequests: [],
    });

    const token2 = signToken(user2._id);

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token2}`)
      .send({
        name: "Club Duplicado",
        country: "Perú",
      });

    expect([400, 409, 500]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe crear club con espacios y guardar valores trim", async () => {
    const user = await createUser({
      username: "trimclub",
      email: "trimclub@mail.com",
      gamerTag: "TrimClub",
    });

    const token = signToken(user._id);

    const res = await request(app)
      .post("/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: " Club Trim ",
        country: " Chile ",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.name).toBe("Club Trim");
    expect(res.body.country).toBe("Chile");

    const clubInDb = await Club.findById(res.body._id);
    expect(clubInDb).not.toBeNull();
    expect(clubInDb.name).toBe("Club Trim");
    expect(clubInDb.country).toBe("Chile");
  });
});