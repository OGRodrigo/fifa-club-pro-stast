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

describe("PUT /clubs/:clubId - update club", () => {
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
      username: "admin_no_token",
      email: "admin_no_token@test.com",
      gamerTag: "AdminNoToken",
    });

    const club = await createClub({
      name: "Club Sin Token",
      country: "Chile",
      members: [{ user: admin._id, role: "admin" }],
    });

    const res = await request(app).put(`/clubs/${club._id}`).send({
      name: "Nuevo Nombre",
      country: "Argentina",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede actualizar name y country", async () => {
    const admin = await createUser({
      username: "admin_update_ok",
      email: "admin_update_ok@test.com",
      gamerTag: "AdminUpdateOK",
    });

    const club = await createClub({
      name: "Club Original",
      country: "Chile",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Club Actualizado",
        country: "Argentina",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(String(res.body._id)).toBe(String(club._id));
    expect(res.body.name).toBe("Club Actualizado");
    expect(res.body.country).toBe("Argentina");

    const updatedClub = await Club.findById(club._id);
    expect(updatedClub).not.toBeNull();
    expect(updatedClub.name).toBe("Club Actualizado");
    expect(updatedClub.country).toBe("Argentina");
  });

  test("admin puede actualizar con trim en name y country", async () => {
    const admin = await createUser({
      username: "admin_trim",
      email: "admin_trim@test.com",
      gamerTag: "AdminTrim",
    });

    const club = await createClub({
      name: "Club Trim Base",
      country: "Chile",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "   Club Trim Editado   ",
        country: "   Perú   ",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Club Trim Editado");
    expect(res.body.country).toBe("Perú");

    const updatedClub = await Club.findById(club._id);
    expect(updatedClub.name).toBe("Club Trim Editado");
    expect(updatedClub.country).toBe("Perú");
  });

  test("member no puede actualizar el club", async () => {
    const admin = await createUser({
      username: "admin_member_block",
      email: "admin_member_block@test.com",
      gamerTag: "AdminMemberBlock",
    });

    const member = await createUser({
      username: "member_update_block",
      email: "member_update_block@test.com",
      gamerTag: "MemberUpdateBlock",
    });

    const club = await createClub({
      name: "Club Roles",
      country: "Chile",
      members: [
        { user: admin._id, role: "admin" },
        { user: member._id, role: "member" },
      ],
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cambio Ilegal",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const sameClub = await Club.findById(club._id);
    expect(sameClub.name).toBe("Club Roles");
  });

  test("captain no puede actualizar el club si la ruta permite solo admin", async () => {
    const admin = await createUser({
      username: "admin_captain_block",
      email: "admin_captain_block@test.com",
      gamerTag: "AdminCaptainBlock",
    });

    const captain = await createUser({
      username: "captain_update_block",
      email: "captain_update_block@test.com",
      gamerTag: "CaptainUpdateBlock",
    });

    const club = await createClub({
      name: "Club Captain",
      country: "Chile",
      members: [
        { user: admin._id, role: "admin" },
        { user: captain._id, role: "captain" },
      ],
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cambio Captain",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const sameClub = await Club.findById(club._id);
    expect(sameClub.name).toBe("Club Captain");
  });

  test("usuario externo no puede actualizar un club ajeno", async () => {
    const admin = await createUser({
      username: "admin_external_block",
      email: "admin_external_block@test.com",
      gamerTag: "AdminExternalBlock",
    });

    const outsider = await createUser({
      username: "outsider_update_block",
      email: "outsider_update_block@test.com",
      gamerTag: "OutsiderUpdateBlock",
    });

    const club = await createClub({
      name: "Club Privado",
      country: "Chile",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(outsider._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Cambio Externo",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const sameClub = await Club.findById(club._id);
    expect(sameClub.name).toBe("Club Privado");
  });

  test("debe devolver 404 si el club no existe", async () => {
    const admin = await createUser({
      username: "admin_not_found",
      email: "admin_not_found@test.com",
      gamerTag: "AdminNotFound",
    });

    const clubIdInexistente = "67c9c2d5d8d4b0198c77f111";
    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${clubIdInexistente}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "No Existe",
      });

    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("message");
  });

  test("debe rechazar nombre duplicado con 409", async () => {
    const admin1 = await createUser({
      username: "admin_dup_1",
      email: "admin_dup_1@test.com",
      gamerTag: "AdminDup1",
    });

    const admin2 = await createUser({
      username: "admin_dup_2",
      email: "admin_dup_2@test.com",
      gamerTag: "AdminDup2",
    });

    const clubA = await createClub({
      name: "Club A",
      country: "Chile",
      members: [{ user: admin1._id, role: "admin" }],
    });

    await createClub({
      name: "Club Ya Existe",
      country: "Argentina",
      members: [{ user: admin2._id, role: "admin" }],
    });

    const token = makeToken(admin1._id);

    const res = await request(app)
      .put(`/clubs/${clubA._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Club Ya Existe",
      });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("message");
  });

  test("debe rechazar nombre duplicado ignorando mayúsculas/minúsculas", async () => {
    const admin1 = await createUser({
      username: "admin_case_1",
      email: "admin_case_1@test.com",
      gamerTag: "AdminCase1",
    });

    const admin2 = await createUser({
      username: "admin_case_2",
      email: "admin_case_2@test.com",
      gamerTag: "AdminCase2",
    });

    const clubA = await createClub({
      name: "Club Alfa",
      country: "Chile",
      members: [{ user: admin1._id, role: "admin" }],
    });

    await createClub({
      name: "FC DRAGONES",
      country: "Perú",
      members: [{ user: admin2._id, role: "admin" }],
    });

    const token = makeToken(admin1._id);

    const res = await request(app)
      .put(`/clubs/${clubA._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "fc dragones",
      });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("message");
  });

  test("debe permitir mantener el mismo nombre del propio club", async () => {
    const admin = await createUser({
      username: "admin_same_name",
      email: "admin_same_name@test.com",
      gamerTag: "AdminSameName",
    });

    const club = await createClub({
      name: "Club Igual",
      country: "Chile",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Club Igual",
        country: "Argentina",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Club Igual");
    expect(res.body.country).toBe("Argentina");
  });

  test("debe actualizar campos opcionales como founded e isPrivate", async () => {
    const admin = await createUser({
      username: "admin_optional_fields",
      email: "admin_optional_fields@test.com",
      gamerTag: "AdminOptionalFields",
    });

    const club = await createClub({
      name: "Club Opcional",
      country: "Chile",
      founded: 2020,
      isPrivate: false,
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .put(`/clubs/${club._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        founded: 2024,
        isPrivate: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.founded).toBe(2024);
    expect(res.body.isPrivate).toBe(true);

    const updatedClub = await Club.findById(club._id);
    expect(updatedClub.founded).toBe(2024);
    expect(updatedClub.isPrivate).toBe(true);
  });
});