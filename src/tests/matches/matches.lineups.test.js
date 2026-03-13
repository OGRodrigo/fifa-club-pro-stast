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
  stadium = "Estadio Lineups",
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

describe("PATCH /matches/:id/clubs/:clubId/lineups - update lineups", () => {
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
      username: "lu_no_token_admin",
      email: "lu_no_token_admin@test.com",
      gamerTag: "LUNoTokenAdmin",
    });

    const homeClub = await createClub({
      name: "LU Home No Token",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "LU Away No Token",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [],
          },
        },
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("admin puede actualizar solo la lineup de su lado", async () => {
    const admin = await createUser({
      username: "lu_admin_ok",
      email: "lu_admin_ok@test.com",
      gamerTag: "LUAdminOK",
    });

    const homePlayer1 = await createUser({
      username: "lu_home_player1",
      email: "lu_home_player1@test.com",
      gamerTag: "LUHomePlayer1",
    });

    const homePlayer2 = await createUser({
      username: "lu_home_player2",
      email: "lu_home_player2@test.com",
      gamerTag: "LUHomePlayer2",
    });

    const awayPlayer = await createUser({
      username: "lu_away_player",
      email: "lu_away_player@test.com",
      gamerTag: "LUAwayPlayer",
    });

    const homeClub = await createClub({
      name: "LU Home Admin OK",
      members: [
        { user: admin._id, role: "admin" },
        { user: homePlayer1._id, role: "member" },
        { user: homePlayer2._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Admin OK",
      members: [{ user: awayPlayer._id, role: "member" }],
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
      lineups: {
        home: {
          formation: "",
          players: [],
        },
        away: {
          formation: "4-4-2",
          players: [
            {
              user: awayPlayer._id,
              position: "CB",
              shirtNumber: 4,
              starter: true,
            },
          ],
        },
      },
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [
              {
                user: String(homePlayer1._id),
                position: "st",
                shirtNumber: 9,
                starter: true,
              },
              {
                user: String(homePlayer2._id),
                position: "cam",
                shirtNumber: 10,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/lineup actualizada/i);
    expect(res.body).toHaveProperty("side", "home");
    expect(res.body.lineups.home.formation).toBe("4-3-3");
    expect(res.body.lineups.home.players).toHaveLength(2);

    const updatedMatch = await Match.findById(match._id);
    expect(updatedMatch.lineups.home.formation).toBe("4-3-3");
    expect(updatedMatch.lineups.home.players).toHaveLength(2);

    // el lado rival debe conservarse intacto
    expect(updatedMatch.lineups.away.formation).toBe("4-4-2");
    expect(updatedMatch.lineups.away.players).toHaveLength(1);
  });

  test("captain también puede actualizar lineups", async () => {
    const captain = await createUser({
      username: "lu_captain_ok",
      email: "lu_captain_ok@test.com",
      gamerTag: "LUCaptainOK",
    });

    const player = await createUser({
      username: "lu_captain_player",
      email: "lu_captain_player@test.com",
      gamerTag: "LUCaptainPlayer",
    });

    const homeClub = await createClub({
      name: "LU Home Captain OK",
      members: [
        { user: captain._id, role: "captain" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Captain OK",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(captain._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-2-3-1",
            players: [
              {
                user: String(player._id),
                position: "st",
                shirtNumber: 11,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("member no puede actualizar lineups", async () => {
    const member = await createUser({
      username: "lu_member_block",
      email: "lu_member_block@test.com",
      gamerTag: "LUMemberBlock",
    });

    const player = await createUser({
      username: "lu_member_block_player",
      email: "lu_member_block_player@test.com",
      gamerTag: "LUMemberBlockPlayer",
    });

    const homeClub = await createClub({
      name: "LU Home Member Block",
      members: [
        { user: member._id, role: "member" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Member Block",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(member._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [],
          },
        },
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  test("debe responder 400 si los IDs son inválidos", async () => {
    const admin = await createUser({
      username: "lu_invalid_ids_admin",
      email: "lu_invalid_ids_admin@test.com",
      gamerTag: "LUInvalidIdsAdmin",
    });

    const club = await createClub({
      name: "LU Club Invalid IDs",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/id-invalido/clubs/${club._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [],
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/ids inválidos/i);
  });

  test("debe responder 404 si el partido no existe", async () => {
    const admin = await createUser({
      username: "lu_missing_match_admin",
      email: "lu_missing_match_admin@test.com",
      gamerTag: "LUMissingMatchAdmin",
    });

    const club = await createClub({
      name: "LU Club Missing Match",
      members: [{ user: admin._id, role: "admin" }],
    });

    const token = makeToken(admin._id);
    const fakeMatchId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/matches/${fakeMatchId}/clubs/${club._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [],
          },
        },
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/partido no encontrado/i);
  });

  test("debe responder 403 si el club actuante no participa en el partido", async () => {
    const admin = await createUser({
      username: "lu_non_participant_admin",
      email: "lu_non_participant_admin@test.com",
      gamerTag: "LUNonParticipantAdmin",
    });

    const actingClub = await createClub({
      name: "LU Acting Outside",
      members: [{ user: admin._id, role: "admin" }],
    });

    const homeClub = await createClub({ name: "LU Home Outside" });
    const awayClub = await createClub({ name: "LU Away Outside" });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${actingClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [],
          },
        },
      });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tu club no participa en este partido/i);
  });

  test("debe responder 400 si players no es array", async () => {
    const admin = await createUser({
      username: "lu_players_not_array_admin",
      email: "lu_players_not_array_admin@test.com",
      gamerTag: "LUPlayersNotArrayAdmin",
    });

    const homeClub = await createClub({
      name: "LU Home Players Not Array",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "LU Away Players Not Array",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: {},
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/players debe ser array/i);
  });

  test("debe responder 400 si falta user en un jugador", async () => {
    const admin = await createUser({
      username: "lu_missing_user_admin",
      email: "lu_missing_user_admin@test.com",
      gamerTag: "LUMissingUserAdmin",
    });

    const homeClub = await createClub({
      name: "LU Home Missing User",
      members: [{ user: admin._id, role: "admin" }],
    });

    const awayClub = await createClub({
      name: "LU Away Missing User",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [
              {
                position: "ST",
                shirtNumber: 9,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/falta user/i);
  });

  test("debe responder 400 si falta position en un jugador", async () => {
    const admin = await createUser({
      username: "lu_missing_position_admin",
      email: "lu_missing_position_admin@test.com",
      gamerTag: "LUMissingPositionAdmin",
    });

    const player = await createUser({
      username: "lu_missing_position_player",
      email: "lu_missing_position_player@test.com",
      gamerTag: "LUMissingPositionPlayer",
    });

    const homeClub = await createClub({
      name: "LU Home Missing Position",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Missing Position",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [
              {
                user: String(player._id),
                shirtNumber: 9,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/falta position/i);
  });

  test("debe responder 400 si hay jugador duplicado", async () => {
    const admin = await createUser({
      username: "lu_duplicate_user_admin",
      email: "lu_duplicate_user_admin@test.com",
      gamerTag: "LUDuplicateUserAdmin",
    });

    const player = await createUser({
      username: "lu_duplicate_user_player",
      email: "lu_duplicate_user_player@test.com",
      gamerTag: "LUDuplicateUserPlayer",
    });

    const homeClub = await createClub({
      name: "LU Home Duplicate User",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Duplicate User",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [
              {
                user: String(player._id),
                position: "ST",
                shirtNumber: 9,
                starter: true,
              },
              {
                user: String(player._id),
                position: "CAM",
                shirtNumber: 10,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/jugador duplicado/i);
  });

  test("debe responder 400 si hay dorsal duplicado", async () => {
    const admin = await createUser({
      username: "lu_duplicate_shirt_admin",
      email: "lu_duplicate_shirt_admin@test.com",
      gamerTag: "LUDuplicateShirtAdmin",
    });

    const player1 = await createUser({
      username: "lu_duplicate_shirt_player1",
      email: "lu_duplicate_shirt_player1@test.com",
      gamerTag: "LUDuplicateShirtPlayer1",
    });

    const player2 = await createUser({
      username: "lu_duplicate_shirt_player2",
      email: "lu_duplicate_shirt_player2@test.com",
      gamerTag: "LUDuplicateShirtPlayer2",
    });

    const homeClub = await createClub({
      name: "LU Home Duplicate Shirt",
      members: [
        { user: admin._id, role: "admin" },
        { user: player1._id, role: "member" },
        { user: player2._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Duplicate Shirt",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-4-2",
            players: [
              {
                user: String(player1._id),
                position: "ST",
                shirtNumber: 9,
                starter: true,
              },
              {
                user: String(player2._id),
                position: "CAM",
                shirtNumber: 9,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/dorsal duplicado/i);
  });

  test("debe responder 400 si shirtNumber es inválido", async () => {
    const admin = await createUser({
      username: "lu_invalid_shirt_admin",
      email: "lu_invalid_shirt_admin@test.com",
      gamerTag: "LUInvalidShirtAdmin",
    });

    const player = await createUser({
      username: "lu_invalid_shirt_player",
      email: "lu_invalid_shirt_player@test.com",
      gamerTag: "LUInvalidShirtPlayer",
    });

    const homeClub = await createClub({
      name: "LU Home Invalid Shirt",
      members: [
        { user: admin._id, role: "admin" },
        { user: player._id, role: "member" },
      ],
    });

    const awayClub = await createClub({
      name: "LU Away Invalid Shirt",
    });

    const match = await createMatch({
      homeClub: homeClub._id,
      awayClub: awayClub._id,
    });

    const token = makeToken(admin._id);

    const res = await request(app)
      .patch(`/matches/${match._id}/clubs/${homeClub._id}/lineups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        lineups: {
          home: {
            formation: "4-3-3",
            players: [
              {
                user: String(player._id),
                position: "ST",
                shirtNumber: 120,
                starter: true,
              },
            ],
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/shirtNumber inválido/i);
  });
});