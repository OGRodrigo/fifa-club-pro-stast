const mongoose = require("mongoose");
const Match = require("../models/Match");
const Club = require("../models/Club");

/**
 * =====================================================
 * HELPERS
 * =====================================================
 */
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const sameId = (a, b) => String(a) === String(b);

function ensureActingClubParticipates(actingClubId, homeClubId, awayClubId) {
  return sameId(actingClubId, homeClubId) || sameId(actingClubId, awayClubId);
}

/**
 * =====================================================
 * MATCHES CONTROLLER
 * -----------------------------------------------------
 * Maneja:
 * - CRUD de partidos
 * - Calendario por season
 * - Head-to-Head
 * - MVP del partido (en tiempo real)
 * - Match Full (con playerStats.user poblado) para frontend
 * =====================================================
 */

/**
 * =====================================================
 * CREATE MATCH
 * -----------------------------------------------------
 * - Crea un partido entre dos clubs
 * - Calcula season automáticamente desde la fecha
 * - Valida coherencia de playerStats (C9)
 *
 * POST /matches/clubs/:clubId
 * Body:
 *  { homeClub, awayClub, date, stadium, scoreHome, scoreAway, playerStats[] }
 * =====================================================
 */
exports.createMatch = async (req, res) => {
  try {
    const { clubId: actingClubId } = req.params;

    const {
      homeClub,
      awayClub,
      date,
      stadium,
      scoreHome,
      scoreAway,
      playerStats = [],
    } = req.body;

    // ✅ Validación mínima
    if (
      !homeClub ||
      !awayClub ||
      !date ||
      !stadium ||
      scoreHome === undefined ||
      scoreAway === undefined
    ) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // ✅ Validar ObjectIds básicos
    if (
      !isValidObjectId(homeClub) ||
      !isValidObjectId(awayClub) ||
      !isValidObjectId(actingClubId)
    ) {
      return res.status(400).json({ message: "IDs de club inválidos" });
    }

    // ✅ No permitir mismo club
    if (sameId(homeClub, awayClub)) {
      return res.status(400).json({
        message: "homeClub y awayClub no pueden ser el mismo club",
      });
    }

    // ✅ El club que actúa debe participar en el partido
    if (!ensureActingClubParticipates(actingClubId, homeClub, awayClub)) {
      return res.status(403).json({
        message: "Tu club no participa en este partido",
      });
    }

    // ✅ Validar fecha real
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    // ✅ Verificar existencia de clubs
    const home = await Club.findById(homeClub);
    const away = await Club.findById(awayClub);
    if (!home || !away) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    // ✅ Season automática desde la fecha
    const season = parsedDate.getFullYear();

    // ✅ playerStats debe ser array
    if (!Array.isArray(playerStats)) {
      return res.status(400).json({ message: "playerStats debe ser un array" });
    }

    /**
     * =====================================================
     * C9 – VALIDACIONES DE COHERENCIA DE STATS
     * -----------------------------------------------------
     * - Campos obligatorios: user + club
     * - club debe ser homeClub o awayClub
     * - No negativos
     * - No duplicados (user + club)
     * - goals <= goles del club
     * - goals + assists <= goles del club
     * =====================================================
     */
    const seenPlayerClub = new Set();

    for (const ps of playerStats) {
      if (!ps.user || !ps.club) {
        return res.status(400).json({ message: "playerStats: falta user o club" });
      }

      const psClub = ps.club.toString();
      const homeId = homeClub.toString();
      const awayId = awayClub.toString();

      // ✅ club del stat debe ser home o away
      if (psClub !== homeId && psClub !== awayId) {
        return res.status(400).json({
          message: "playerStats.club debe ser homeClub o awayClub del partido",
        });
      }

      // ✅ no negativos
      if (ps.goals !== undefined && Number(ps.goals) < 0) {
        return res.status(400).json({ message: "goals no puede ser negativo" });
      }
      if (ps.assists !== undefined && Number(ps.assists) < 0) {
        return res.status(400).json({ message: "assists no puede ser negativo" });
      }

      // ✅ evitar duplicados del mismo jugador en el mismo club
      const key = `${ps.user.toString()}-${psClub}`;
      if (seenPlayerClub.has(key)) {
        return res.status(400).json({
          message: "Jugador duplicado en playerStats para el mismo club",
        });
      }
      seenPlayerClub.add(key);

      // ✅ coherencia con el marcador
      const maxGoalsForClub =
        psClub === homeId ? Number(scoreHome) : Number(scoreAway);

      const goals = Number(ps.goals || 0);
      const assists = Number(ps.assists || 0);
      const contrib = goals + assists;

      if (goals > maxGoalsForClub) {
        return res.status(400).json({
          message: "Goles del jugador exceden los goles del club",
        });
      }

      if (contrib > maxGoalsForClub) {
        return res.status(400).json({
          message: "Goles + asistencias exceden los goles del club",
        });
      }
    }

    // ✅ Crear partido
    const match = await Match.create({
      homeClub,
      awayClub,
      date: parsedDate,
      stadium,
      scoreHome,
      scoreAway,
      season,
      playerStats,
    });

    return res.status(201).json(match);
  } catch (error) {
    console.error("CREATE MATCH ERROR:", error);
    return res.status(500).json({
      message: "Error al crear partido",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * GET MATCHES
 * -----------------------------------------------------
 * Lista con filtros opcionales + paginación
 * GET /matches?season=&club=&from=&to=&stadium=&page=&limit=
 * =====================================================
 */
exports.getMatches = async (req, res) => {
  try {
    const { season, club, from, to, stadium, page = 1, limit = 10 } = req.query;
    const filter = {};

    // ✅ season
    if (season !== undefined) {
      const year = Number(season);
      if (isNaN(year)) return res.status(400).json({ message: "Season inválida" });
      filter.season = year;
    }

    // ✅ club
    if (club) {
      filter.$or = [{ homeClub: club }, { awayClub: club }];
    }

    // ✅ stadium
    if (stadium) filter.stadium = stadium;

    // ✅ fechas from/to (validar)
    if (from || to) {
      filter.date = {};

      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({ message: "Fecha 'from' inválida" });
        }
        filter.date.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({ message: "Fecha 'to' inválida" });
        }
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    // ✅ paginación
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "page inválida" });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ message: "limit inválido" });
    }

    const matches = await Match.find(filter)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country")
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Match.countDocuments(filter);

    return res.status(200).json({
      page: pageNum,
      limit: limitNum,
      totalMatches: total,
      totalPages: Math.ceil(total / limitNum),
      data: matches,
    });
  } catch (error) {
    console.error("getMatches ERROR:", error);
    return res.status(500).json({ message: "Error al obtener partidos" });
  }
};

/**
 * =====================================================
 * GET MATCH BY ID
 * GET /matches/:id
 * =====================================================
 */
exports.getMatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country");

    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    return res.status(200).json(match);
  } catch (error) {
    console.error("getMatchById ERROR:", error);
    return res.status(400).json({ message: "ID de partido inválido" });
  }
};

/**
 * =====================================================
 * MATCH FULL (incluye playerStats.user poblado)
 * GET /matches/:id/full
 * =====================================================
 */
exports.getMatchByIdFull = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de partido inválido" });
    }

    const match = await Match.findById(id)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country")
      .populate("playerStats.user", "username gamerTag platform");

    if (!match) {
      return res.status(404).json({ message: "Partido no encontrado" });
    }

    return res.status(200).json(match);
  } catch (error) {
    console.error("getMatchByIdFull ERROR:", error);
    return res.status(500).json({ message: "Error al obtener partido full" });
  }
};

/**
 * =====================================================
 * DELETE MATCH
 * DELETE /matches/:id/clubs/:clubId
 * =====================================================
 */
exports.deleteMatch = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(actingClubId)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    if (
      !ensureActingClubParticipates(
        actingClubId,
        match.homeClub.toString(),
        match.awayClub.toString()
      )
    ) {
      return res.status(403).json({
        message: "Tu club no participa en este partido",
      });
    }

    await Match.findByIdAndDelete(id);

    return res.status(200).json({ message: "Partido eliminado correctamente" });
  } catch (error) {
    console.error("deleteMatch ERROR:", error);
    return res.status(400).json({ message: "ID de partido inválido" });
  }
};

/**
 * =====================================================
 * HEAD TO HEAD (H2H)
 * GET /matches/h2h/:clubA/:clubB
 * =====================================================
 */
exports.getMatchesHeadToHead = async (req, res) => {
  try {
    const { clubA, clubB } = req.params;

    const matches = await Match.find({
      $or: [
        { homeClub: clubA, awayClub: clubB },
        { homeClub: clubB, awayClub: clubA },
      ],
    })
      .populate("homeClub", "name")
      .populate("awayClub", "name")
      .sort({ date: -1 });

    let played = 0;
    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    let goalsA = 0;
    let goalsB = 0;

    matches.forEach((m) => {
      played += 1;

      const aIsHome = m.homeClub._id.toString() === clubA;
      const gfA = aIsHome ? m.scoreHome : m.scoreAway;
      const gfB = aIsHome ? m.scoreAway : m.scoreHome;

      goalsA += gfA;
      goalsB += gfB;

      if (gfA > gfB) winsA += 1;
      else if (gfA < gfB) winsB += 1;
      else draws += 1;
    });

    return res.status(200).json({
      clubA,
      clubB,
      played,
      winsA,
      winsB,
      draws,
      goalsA,
      goalsB,
      matches,
    });
  } catch (err) {
    console.error("getMatchesHeadToHead ERROR:", err);
    return res.status(500).json({ message: "Error al obtener H2H" });
  }
};

/**
 * =====================================================
 * UPDATE MATCH
 * -----------------------------------------------------
 * Edita campos básicos del partido y recalcula season si cambia date.
 * (No toca playerStats; eso se puede hacer con un PATCH separado)
 * PUT /matches/:id/clubs/:clubId
 * =====================================================
 */
exports.updateMatch = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;
    const { homeClub, awayClub, date, stadium, scoreHome, scoreAway } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(actingClubId)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    // Valores finales proyectados
    const nextHomeClub = homeClub ?? match.homeClub;
    const nextAwayClub = awayClub ?? match.awayClub;

    if (sameId(nextHomeClub, nextAwayClub)) {
      return res.status(400).json({
        message: "homeClub y awayClub no pueden ser el mismo club",
      });
    }

    // El club actuante debe seguir participando en el partido
    if (!ensureActingClubParticipates(actingClubId, nextHomeClub, nextAwayClub)) {
      return res.status(403).json({
        message: "Tu club no participa en este partido",
      });
    }

    // Si cambian clubs, validar existencia
    if (homeClub !== undefined) {
      if (!isValidObjectId(homeClub)) {
        return res.status(400).json({ message: "homeClub inválido" });
      }
      const existsHome = await Club.findById(homeClub).select("_id");
      if (!existsHome) {
        return res.status(404).json({ message: "homeClub no encontrado" });
      }
      match.homeClub = homeClub;
    }

    if (awayClub !== undefined) {
      if (!isValidObjectId(awayClub)) {
        return res.status(400).json({ message: "awayClub inválido" });
      }
      const existsAway = await Club.findById(awayClub).select("_id");
      if (!existsAway) {
        return res.status(404).json({ message: "awayClub no encontrado" });
      }
      match.awayClub = awayClub;
    }

    if (stadium !== undefined) match.stadium = stadium;
    if (scoreHome !== undefined) match.scoreHome = scoreHome;
    if (scoreAway !== undefined) match.scoreAway = scoreAway;

    if (date !== undefined) {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: "Fecha inválida" });
      }
      match.date = d;
      match.season = d.getFullYear();
    }

    await match.save();

    const populated = await Match.findById(match._id)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country");

    return res.status(200).json(populated);
  } catch (error) {
    console.error("updateMatch ERROR:", error);
    return res.status(500).json({ message: "Error al actualizar partido" });
  }
};

/**
 * =====================================================
 * CALENDAR
 * GET /matches/calendar?season=2029&type=future|past|all
 * =====================================================
 */
exports.getCalendar = async (req, res) => {
  try {
    const { season, type } = req.query;

    const year = Number(season);
    if (isNaN(year)) return res.status(400).json({ message: "Season inválida" });

    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    // filtro base season
    const filter = { season: year, date: { $gte: start, $lte: end } };

    // future/past ajusta el rango
    const now = new Date();
    if (type === "future") filter.date.$gte = now;
    if (type === "past") filter.date.$lte = now;

    const matches = await Match.find(filter)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country")
      .sort({ date: 1 });

    return res.status(200).json({
      season: year,
      type: type || "all",
      total: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error("getCalendar ERROR:", err);
    return res.status(500).json({ message: "Error al obtener calendario" });
  }
};

/**
 * =====================================================
 * MVP DEL PARTIDO (en tiempo real)
 * -----------------------------------------------------
 * - NO guarda nada en BD
 * - Usa playerStats + resultado del partido
 * GET /matches/:id/mvp
 * =====================================================
 */
exports.getMatchMVP = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id)
      .populate("playerStats.user", "username gamerTag")
      .populate("homeClub", "name")
      .populate("awayClub", "name");

    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    if (!match.playerStats || match.playerStats.length === 0) {
      return res.status(200).json({
        matchId: id,
        mvp: null,
        message: "El partido no tiene estadísticas de jugadores",
      });
    }

    let winnerClubId = null;
    if (match.scoreHome > match.scoreAway) winnerClubId = match.homeClub._id.toString();
    else if (match.scoreAway > match.scoreHome) winnerClubId = match.awayClub._id.toString();

    const map = new Map();

    match.playerStats.forEach((ps) => {
      const uid = ps.user?._id?.toString?.() || ps.user?.toString?.();
      const uname = ps.user?.username || ps.user?.gamerTag || "unknown";

      if (!uid) return;

      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          username: ps.user?.username || "unknown",
          gamerTag: ps.user?.gamerTag || "",
          clubId: ps.club.toString(),
          goals: 0,
          assists: 0,
          points: 0,
        });
      }

      const row = map.get(uid);
      const g = Number(ps.goals || 0);
      const a = Number(ps.assists || 0);

      row.goals += g;
      row.assists += a;
      row.points += g * 2 + a;
    });

    map.forEach((row) => {
      if (!winnerClubId) return;
      if (row.clubId === winnerClubId) row.points += 1;
      else row.points -= 1;
    });

    const players = Array.from(map.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.username.localeCompare(b.username);
    });

    return res.status(200).json({
      match: {
        id: match._id,
        homeClub: match.homeClub.name,
        awayClub: match.awayClub.name,
        score: `${match.scoreHome}-${match.scoreAway}`,
      },
      mvp: players[0] || null,
    });
  } catch (err) {
    console.error("getMatchMVP ERROR:", err);
    return res.status(500).json({ message: "Error al calcular MVP" });
  }
};

/**
 * =====================================================
 * PATCH PLAYER STATS
 * -----------------------------------------------------
 * PATCH /matches/:id/clubs/:clubId/player-stats
 * Body: { playerStats: [{ user, club, goals, assists }] }
 *
 * Reglas:
 * - club debe ser homeClub o awayClub
 * - el club actuante debe participar en el partido
 * - no duplicados (user+club)
 * - no negativos
 * - sum(goals) por club == score del club (opcional strict)
 * - sum(assists) por club <= score del club
 * =====================================================
 */
exports.updateMatchPlayerStats = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;
    const { playerStats = [], strictTotals = true } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(actingClubId)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    const homeId = match.homeClub.toString();
    const awayId = match.awayClub.toString();

    if (!ensureActingClubParticipates(actingClubId, homeId, awayId)) {
      return res.status(403).json({
        message: "Tu club no participa en este partido",
      });
    }

    if (!Array.isArray(playerStats)) {
      return res.status(400).json({ message: "playerStats debe ser un array" });
    }

    const seen = new Set();

    let homeGoalsSum = 0;
    let awayGoalsSum = 0;
    let homeAssistsSum = 0;
    let awayAssistsSum = 0;

    for (const ps of playerStats) {
      if (!ps.user || !ps.club) {
        return res.status(400).json({ message: "playerStats: falta user o club" });
      }

      const psClub = ps.club.toString();

      if (psClub !== homeId && psClub !== awayId) {
        return res.status(400).json({
          message: "playerStats.club debe ser homeClub o awayClub del partido",
        });
      }

      const g = Number(ps.goals || 0);
      const a = Number(ps.assists || 0);

      if (g < 0) return res.status(400).json({ message: "goals no puede ser negativo" });
      if (a < 0) return res.status(400).json({ message: "assists no puede ser negativo" });

      const key = `${ps.user.toString()}-${psClub}`;
      if (seen.has(key)) {
        return res.status(400).json({
          message: "Jugador duplicado en playerStats para el mismo club",
        });
      }
      seen.add(key);

      const maxGoalsForClub =
        psClub === homeId ? Number(match.scoreHome) : Number(match.scoreAway);

      if (g > maxGoalsForClub) {
        return res.status(400).json({
          message: "Goles del jugador exceden los goles del club",
        });
      }

      if (g + a > maxGoalsForClub) {
        return res.status(400).json({
          message: "Goles + asistencias exceden los goles del club",
        });
      }

      if (psClub === homeId) {
        homeGoalsSum += g;
        homeAssistsSum += a;
      } else {
        awayGoalsSum += g;
        awayAssistsSum += a;
      }
    }

    if (homeAssistsSum > Number(match.scoreHome)) {
      return res.status(400).json({ message: "Asistencias HOME exceden goles HOME" });
    }

    if (awayAssistsSum > Number(match.scoreAway)) {
      return res.status(400).json({ message: "Asistencias AWAY exceden goles AWAY" });
    }

    if (strictTotals) {
      if (homeGoalsSum !== Number(match.scoreHome)) {
        return res.status(400).json({
          message: `HOME: la suma de goles (${homeGoalsSum}) no coincide con scoreHome (${match.scoreHome})`,
        });
      }

      if (awayGoalsSum !== Number(match.scoreAway)) {
        return res.status(400).json({
          message: `AWAY: la suma de goles (${awayGoalsSum}) no coincide con scoreAway (${match.scoreAway})`,
        });
      }
    }

    match.playerStats = playerStats;
    await match.save();

    const populated = await Match.findById(match._id)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country")
      .populate("playerStats.user", "username gamerTag platform");

    return res.status(200).json({
      message: "playerStats actualizados",
      match: populated,
    });
  } catch (error) {
    console.error("updateMatchPlayerStats ERROR:", error);
    return res.status(500).json({ message: "Error al actualizar playerStats" });
  }
};