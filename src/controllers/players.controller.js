const Match = require("../models/Match");
const Club = require("../models/Club");
const User = require("../models/User");

/**
 * =====================================================
 * PLAYER STATS CONTROLLER
 * -----------------------------------------------------
 * Este controller resuelve:
 * - Stats de un jugador en un club (con season y/o rango)
 * - Stats del usuario logueado (/me)
 * - Tabla de jugadores del club (acumulado)
 * - Top scorers / Top assists
 * - MVP de una season
 * - Leaderboards unificados (opción B)
 * =====================================================
 */

/** =========================
 * Helpers (internos)
 * ========================= */

// Parsea season opcional. Devuelve number o null.
const parseSeasonOptional = (season) => {
  if (season === undefined) return null;
  const year = Number(season);
  if (Number.isNaN(year)) return { error: "Season inválida" };
  return year;
};

// Parsea season obligatoria. Devuelve number o {error}.
const parseSeasonRequired = (season) => {
  if (!season) return { error: "Season requerida" };
  const year = Number(season);
  if (Number.isNaN(year)) return { error: "Season inválida" };
  return year;
};

// Parsea from/to opcional. Devuelve { fromDate, toDate } o { error }.
const parseDateRangeOptional = (from, to) => {
  let fromDate = null;
  let toDate = null;

  if (from) {
    fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) return { error: "Fecha 'from' inválida" };
  }

  if (to) {
    toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) return { error: "Fecha 'to' inválida" };
    // incluye todo el día si llega YYYY-MM-DD
    toDate.setHours(23, 59, 59, 999);
  }

  return { fromDate, toDate };
};

// Valida limit (default 10). Devuelve number o {error}
const parseLimit = (limit, defaultValue = 10) => {
  const lim = limit === undefined ? defaultValue : Number(limit);
  if (Number.isNaN(lim) || lim < 1 || lim > 100) return { error: "limit inválido" };
  return lim;
};

// Construye matchFilter para club + season opcional + rango opcional + (extra conditions)
const buildMatchFilter = ({ clubId, year, fromDate, toDate, extra = {} }) => {
  const filter = { "playerStats.club": clubId, ...extra };

  if (year !== null) filter.season = year;

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = fromDate;
    if (toDate) filter.date.$lte = toDate;
  }

  return filter;
};

/**
 * Acumula stats por jugador a partir de matches.
 * - Solo toma filas playerStats del club (y opcionalmente de un user específico)
 * - played: cuenta 1 por match si el jugador tuvo al menos una fila en ese match
 * - points: g*2 + a (+bonus por resultado SOLO para jugadores del match)
 */
const aggregateByPlayer = (matches, clubId, onlyUserId = null) => {
  const map = new Map(); // userId -> row

  matches.forEach(m => {
    // Determinar resultado (para bonus de puntos)
    let winnerClubId = null;
    if (m.scoreHome > m.scoreAway) winnerClubId = m.homeClub.toString();
    else if (m.scoreAway > m.scoreHome) winnerClubId = m.awayClub.toString();

    const statsRows = (m.playerStats || []).filter(ps => {
      const clubOk = ps.club.toString() === clubId;
      if (!clubOk) return false;
      if (onlyUserId) return ps.user.toString() === onlyUserId;
      return true;
    });

    // Para played: 1 por match por jugador
    const seenThisMatch = new Set();

    statsRows.forEach(ps => {
      const uid = ps.user?._id ? ps.user._id.toString() : ps.user.toString();
const uname = ps.user?.username || "unknown";
const gamerTag = ps.user?.gamerTag || "";

      if (!map.has(uid)) {
        map.set(uid, {
  userId: uid,
  username: uname,
  gamerTag,
  played: 0,
  goals: 0,
  assists: 0,
  contrib: 0,
  points: 0
});
      }

      const row = map.get(uid);
      const g = Number(ps.goals || 0);
      const a = Number(ps.assists || 0);

      row.goals += g;
      row.assists += a;
      row.contrib += g + a;
      row.points += g * 2 + a;

      if (!seenThisMatch.has(uid)) {
        row.played += 1;
        seenThisMatch.add(uid);
      }
    });

    // ✅ Bonus por resultado: SOLO a los que jugaron este match
    if (winnerClubId) {
      seenThisMatch.forEach(uid => {
        const row = map.get(uid);
        if (!row) return;
        if (winnerClubId === clubId) row.points += 1;
        else row.points -= 1;
      });
    }
  });

  return map;
};

// redondeo seguro
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * =====================================================
 * GET /clubs/:clubId/players/:userId/stats
 * season/from/to opcionales (pero recomendado)
 * =====================================================
 */
exports.getPlayerStats = async (req, res) => {
  try {
    const { clubId, userId } = req.params;
    const { season, from, to } = req.query;

    // Validar club
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    // Validar usuario
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Season opcional
    const yearParsed = parseSeasonOptional(season);
    if (yearParsed && yearParsed.error) return res.status(400).json({ message: yearParsed.error });
    const year = yearParsed; // number | null

    // Rango opcional
    const range = parseDateRangeOptional(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    // Filtro: solo matches donde aparezca el jugador en ese club
    const matchFilter = buildMatchFilter({
      clubId,
      year,
      fromDate: range.fromDate,
      toDate: range.toDate,
      extra: { "playerStats.user": userId }
    });

    const matches = await Match.find(matchFilter);

    // Acumular solo para ese userId
    const map = aggregateByPlayer(matches, clubId, userId);
    const row = map.get(userId) || {
      userId,
      username: user.username,
      played: 0,
      goals: 0,
      assists: 0,
      contrib: 0,
      points: 0
    };

    const goalPerMatch = row.played > 0 ? round2(row.goals / row.played) : 0;
    const assistPerMatch = row.played > 0 ? round2(row.assists / row.played) : 0;
    const contribPerMatch = row.played > 0 ? round2(row.contrib / row.played) : 0;

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      player: { id: user._id, username: user.username },
      season: year,
      from: from || null,
      to: to || null,

      played: row.played,
      goals: row.goals,
      assists: row.assists,
      goalContrib: row.contrib,
      goalPerMatch,
      assistPerMatch,
      contribPerMatch
    });
  } catch (err) {
    console.error("getPlayerStats ERROR:", err);
    return res.status(500).json({
      message: "Error al obtener stats del jugador",
      error: err.message,
      where: "getPlayerStats"
    });
  }
};

/**
 * =====================================================
 * GET /clubs/:clubId/players/me/stats
 * Usa header x-user-id
 * =====================================================
 */
exports.getMyPlayerStats = async (req, res) => {
  const actorUserId = req.user?.id; // desde JWT
  if (!actorUserId) {
    return res.status(400).json({ message: "Falta header x-user-id" });
  }

  req.params.userId = actorUserId;
  return exports.getPlayerStats(req, res);
};

/**
 * =====================================================
 * GET /clubs/:clubId/players/stats
 * Tabla acumulada por jugador del club
 * Reglas: debe venir season o from/to
 * =====================================================
 */
exports.getClubPlayersStats = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const yearParsed = parseSeasonOptional(season);
    if (yearParsed && yearParsed.error) return res.status(400).json({ message: yearParsed.error });
    const year = yearParsed;

    const range = parseDateRangeOptional(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    // Seguridad: debe venir season o rango
    if (year === null && !range.fromDate && !range.toDate) {
      return res.status(400).json({
        message: "Debes enviar season o un rango de fechas (from/to)"
      });
    }

    const matchFilter = buildMatchFilter({
      clubId,
      year,
      fromDate: range.fromDate,
      toDate: range.toDate
    });

    const matches = await Match.find(matchFilter).populate("playerStats.user", "username gamerTag");

    const map = aggregateByPlayer(matches, clubId);
    const players = Array.from(map.values()).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.assists - a.assists;
    });

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      season: year,
      from: from || null,
      to: to || null,
      totalPlayers: players.length,
      players: players.map(p => ({
        userId: p.userId,
        username: p.username,
        played: p.played,
        goals: p.goals,
        assists: p.assists
      }))
    });
  } catch (err) {
    console.error("getClubPlayersStats ERROR:", err);
    return res.status(500).json({ message: "Error al obtener stats del club" });
  }
};

/**
 * =====================================================
 * GET /clubs/:clubId/players/top-scorers
 * =====================================================
 */
exports.getTopScorers = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, limit = 10 } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const limitParsed = parseLimit(limit);
    if (limitParsed.error) return res.status(400).json({ message: limitParsed.error });
    const limitNum = limitParsed;

    const yearParsed = parseSeasonOptional(season);
    if (yearParsed && yearParsed.error) return res.status(400).json({ message: yearParsed.error });
    const year = yearParsed;

    const matchFilter = buildMatchFilter({ clubId, year });
    const matches = await Match.find(matchFilter).populate("playerStats.user", "username gamerTag");

    const map = aggregateByPlayer(matches, clubId);
    const topScorers = Array.from(map.values())
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.played - a.played)
      .slice(0, limitNum)
      .map(p => ({
        userId: p.userId,
        username: p.username,
        played: p.played,
        goals: p.goals,
        assists: p.assists
      }));

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      season: year,
      limit: limitNum,
      topScorers,
      notes: topScorers.length === 0 ? "Aún no hay goles registrados" : null
    });
  } catch (err) {
    console.error("getTopScorers ERROR:", err);
    return res.status(500).json({ message: "Error al obtener top scorers" });
  }
};

/**
 * =====================================================
 * GET /clubs/:clubId/players/top-assists
 * =====================================================
 */
exports.getTopAssists = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, limit = 10 } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const limitParsed = parseLimit(limit);
    if (limitParsed.error) return res.status(400).json({ message: limitParsed.error });
    const limitNum = limitParsed;

    const yearParsed = parseSeasonOptional(season);
    if (yearParsed && yearParsed.error) return res.status(400).json({ message: yearParsed.error });
    const year = yearParsed;

    const matchFilter = buildMatchFilter({ clubId, year });
    const matches = await Match.find(matchFilter).populate("playerStats.user", "username gamerTag");

    const map = aggregateByPlayer(matches, clubId);
    const topAssists = Array.from(map.values())
      .filter(p => p.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.played - a.played)
      .slice(0, limitNum)
      .map(p => ({
        userId: p.userId,
        username: p.username,
        played: p.played,
        goals: p.goals,
        assists: p.assists
      }));

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      season: year,
      limit: limitNum,
      topAssists,
      notes: topAssists.length === 0 ? "Aún no hay asistencias registradas" : null
    });
  } catch (err) {
    console.error("getTopAssists ERROR:", err);
    return res.status(500).json({ message: "Error al obtener top assists" });
  }
};

/**
 * =====================================================
 * GET /clubs/:clubId/players/mvp-season?season=2029
 * Season requerida
 * =====================================================
 */
exports.getSeasonMVP = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season } = req.query;

    const yearParsed = parseSeasonRequired(season);
    if (yearParsed.error) return res.status(400).json({ message: yearParsed.error });
    const year = yearParsed;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      season: year,
      "playerStats.club": clubId
    }).populate("playerStats.user", "username gamerTag");

    if (matches.length === 0) {
      return res.status(200).json({
        club: { id: clubId, name: club.name },
        season: year,
        mvp: null,
        message: "No hay partidos para esta season"
      });
    }

    const map = aggregateByPlayer(matches, clubId);
    const players = Array.from(map.values()).sort((a, b) =>
      b.points - a.points ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.played - a.played
    );

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      season: year,
      mvp: players[0]
    });
  } catch (err) {
    console.error("getSeasonMVP ERROR:", err);
    return res.status(500).json({ message: "Error al calcular MVP de la season" });
  }
};

/**
 * =====================================================
 * GET /clubs/:clubId/players/leaderboards
 * season opcional, from/to opcional, limit opcional
 * Reglas: debe venir season o rango
 * =====================================================
 */
exports.getLeaderboards = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to, limit = 10 } = req.query;

    const limitParsed = parseLimit(limit);
    if (limitParsed.error) return res.status(400).json({ message: limitParsed.error });
    const limitNum = limitParsed;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const yearParsed = parseSeasonOptional(season);
    if (yearParsed && yearParsed.error) return res.status(400).json({ message: yearParsed.error });
    const year = yearParsed;

    const range = parseDateRangeOptional(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    if (year === null && !range.fromDate && !range.toDate) {
      return res.status(400).json({
        message: "Debes enviar season o un rango de fechas (from/to)"
      });
    }

    const matchFilter = buildMatchFilter({
      clubId,
      year,
      fromDate: range.fromDate,
      toDate: range.toDate
    });

    const matches = await Match.find(matchFilter).populate("playerStats.user", "username gamerTag");
    const map = aggregateByPlayer(matches, clubId);
    const players = Array.from(map.values());

    const topScorers = [...players]
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
      .slice(0, limitNum);

    const topAssists = [...players]
      .filter(p => p.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
      .slice(0, limitNum);

    const topContrib = [...players]
      .filter(p => p.contrib > 0)
      .sort((a, b) => b.contrib - a.contrib || b.goals - a.goals)
      .slice(0, limitNum);

    const mvpSeason = players.length > 0
      ? [...players].sort((a, b) =>
          b.points - a.points ||
          b.goals - a.goals ||
          b.assists - a.assists ||
          b.played - a.played
        )[0]
      : null;

    const notes = {};
    if (topScorers.length === 0) notes.topScorers = "Aún no hay goles registrados";
    if (topAssists.length === 0) notes.topAssists = "Aún no hay asistencias registradas";
    if (topContrib.length === 0) notes.topContrib = "Aún no hay contribuciones registradas";
    if (!mvpSeason) notes.mvpSeason = "Aún no hay MVP para este filtro";

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      season: year,
      from: from || null,
      to: to || null,
      limit: limitNum,
      leaderboards: {
        topScorers,
        topAssists,
        topContrib,
        mvpSeason,
        notes
      }
    });
  } catch (err) {
    console.error("getLeaderboards ERROR:", err);
    return res.status(500).json({
      message: "Error al obtener leaderboards",
      error: err.message,
      where: "getLeaderboards"
    });
  }
};
