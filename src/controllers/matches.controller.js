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

function parseMatchDate(date) {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return null;
  return parsedDate;
}

function validateNonNegativeNumber(value, fieldName) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num) || num < 0) {
    return `${fieldName} inválido`;
  }
  return null;
}

function validatePercent(value, fieldName) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num) || num < 0 || num > 100) {
    return `${fieldName} debe estar entre 0 y 100`;
  }
  return null;
}

function normalizeTeamStats(raw = {}) {
  return {
    possession: Number(raw.possession || 0),

    shots: Number(raw.shots || 0),
    shotsOnTarget: Number(raw.shotsOnTarget || 0),
    shotAccuracy: Number(raw.shotAccuracy || 0),
    expectedGoals: Number(raw.expectedGoals || 0),

    passes: Number(raw.passes || 0),
    passesCompleted: Number(raw.passesCompleted || 0),
    passAccuracy: Number(raw.passAccuracy || 0),

    dribbleSuccess: Number(raw.dribbleSuccess || 0),

    tackles: Number(raw.tackles || 0),
    tacklesWon: Number(raw.tacklesWon || 0),
    tackleSuccess: Number(raw.tackleSuccess || 0),

    recoveries: Number(raw.recoveries || 0),
    interceptions: Number(raw.interceptions || 0),
    clearances: Number(raw.clearances || 0),
    blocks: Number(raw.blocks || 0),
    saves: Number(raw.saves || 0),

    fouls: Number(raw.fouls || 0),
    offsides: Number(raw.offsides || 0),
    corners: Number(raw.corners || 0),
    freeKicks: Number(raw.freeKicks || 0),
    penalties: Number(raw.penalties || 0),

    yellowCards: Number(raw.yellowCards || 0),
    redCards: Number(raw.redCards || 0),
  };
}

function validateTeamStats(teamStats, sideLabel) {
  const numericFields = [
    "shots",
    "shotsOnTarget",
    "expectedGoals",
    "passes",
    "passesCompleted",
    "tackles",
    "tacklesWon",
    "recoveries",
    "interceptions",
    "clearances",
    "blocks",
    "saves",
    "fouls",
    "offsides",
    "corners",
    "freeKicks",
    "penalties",
    "yellowCards",
    "redCards",
  ];

  for (const field of numericFields) {
    const err = validateNonNegativeNumber(teamStats[field], `${sideLabel}.${field}`);
    if (err) return err;
  }

  const percentFields = [
    "possession",
    "shotAccuracy",
    "passAccuracy",
    "dribbleSuccess",
    "tackleSuccess",
  ];

  for (const field of percentFields) {
    const err = validatePercent(teamStats[field], `${sideLabel}.${field}`);
    if (err) return err;
  }

  if (Number(teamStats.shotsOnTarget || 0) > Number(teamStats.shots || 0)) {
    return `${sideLabel}.shotsOnTarget no puede exceder shots`;
  }

  if (Number(teamStats.passesCompleted || 0) > Number(teamStats.passes || 0)) {
    return `${sideLabel}.passesCompleted no puede exceder passes`;
  }

  if (Number(teamStats.tacklesWon || 0) > Number(teamStats.tackles || 0)) {
    return `${sideLabel}.tacklesWon no puede exceder tackles`;
  }

  return null;
}

function normalizeLineup(lineup = {}) {
  return {
    formation: String(lineup.formation || "").trim(),
    players: Array.isArray(lineup.players)
      ? lineup.players.map((p) => ({
          user: p.user,
          position: String(p.position || "").trim().toUpperCase(),
          shirtNumber:
            p.shirtNumber === undefined || p.shirtNumber === null
              ? undefined
              : Number(p.shirtNumber),
          starter: p.starter === undefined ? true : Boolean(p.starter),
        }))
      : [],
  };
}

function validateLineup(lineup, sideLabel) {
  if (!lineup) return null;

  if (!Array.isArray(lineup.players)) {
    return `${sideLabel}.players debe ser array`;
  }

  const seenUsers = new Set();
  const seenShirts = new Set();

  for (const player of lineup.players) {
    if (!player.user) {
      return `${sideLabel}.players: falta user`;
    }

    if (!player.position) {
      return `${sideLabel}.players: falta position`;
    }

    const userKey = String(player.user);
    if (seenUsers.has(userKey)) {
      return `${sideLabel}.players: jugador duplicado`;
    }
    seenUsers.add(userKey);

    if (player.shirtNumber !== undefined) {
      const num = Number(player.shirtNumber);
      if (Number.isNaN(num) || num < 1 || num > 99) {
        return `${sideLabel}.players: shirtNumber inválido`;
      }

      if (seenShirts.has(num)) {
        return `${sideLabel}.players: dorsal duplicado`;
      }
      seenShirts.add(num);
    }
  }

  return null;
}

function normalizePlayerStats(playerStats = []) {
  return playerStats.map((ps) => ({
    user: ps.user,
    club: ps.club,

    position: String(ps.position || "").trim().toUpperCase(),
    rating: Number(ps.rating || 0),
    minutesPlayed: Number(ps.minutesPlayed ?? 90),
    isMVP: Boolean(ps.isMVP || false),

    goals: Number(ps.goals || 0),
    assists: Number(ps.assists || 0),

    shots: Number(ps.shots || 0),
    shotsOnTarget: Number(ps.shotsOnTarget || 0),
    shotAccuracy: Number(ps.shotAccuracy || 0),

    passes: Number(ps.passes || 0),
    passesCompleted: Number(ps.passesCompleted || 0),
    passAccuracy: Number(ps.passAccuracy || 0),
    keyPasses: Number(ps.keyPasses || 0),

    dribbles: Number(ps.dribbles || 0),
    dribblesWon: Number(ps.dribblesWon || 0),
    dribbleSuccess: Number(ps.dribbleSuccess || 0),

    tackles: Number(ps.tackles || 0),
    tacklesWon: Number(ps.tacklesWon || 0),
    interceptions: Number(ps.interceptions || 0),
    recoveries: Number(ps.recoveries || 0),
    clearances: Number(ps.clearances || 0),
    blocks: Number(ps.blocks || 0),
    saves: Number(ps.saves || 0),

    fouls: Number(ps.fouls || 0),
    yellowCards: Number(ps.yellowCards || 0),
    redCards: Number(ps.redCards || 0),
  }));
}

function validatePlayerStats(playerStats, homeId, awayId, scoreHome, scoreAway, strictTotals = true) {
  if (!Array.isArray(playerStats)) {
    return "playerStats debe ser un array";
  }

  const seen = new Set();

  let homeGoalsSum = 0;
  let awayGoalsSum = 0;
  let homeAssistsSum = 0;
  let awayAssistsSum = 0;
  let mvpCount = 0;

  for (const ps of playerStats) {
    if (!ps.user || !ps.club) {
      return "playerStats: falta user o club";
    }

    const psClub = String(ps.club);

    if (psClub !== String(homeId) && psClub !== String(awayId)) {
      return "playerStats.club debe ser homeClub o awayClub del partido";
    }

    const nonNegativeFields = [
      "goals",
      "assists",
      "shots",
      "shotsOnTarget",
      "passes",
      "passesCompleted",
      "keyPasses",
      "dribbles",
      "dribblesWon",
      "tackles",
      "tacklesWon",
      "interceptions",
      "recoveries",
      "clearances",
      "blocks",
      "saves",
      "fouls",
      "yellowCards",
      "redCards",
      "minutesPlayed",
    ];

    for (const field of nonNegativeFields) {
      const err = validateNonNegativeNumber(ps[field], `playerStats.${field}`);
      if (err) return err;
    }

    const percentFields = ["rating", "shotAccuracy", "passAccuracy", "dribbleSuccess"];
    for (const field of percentFields) {
      if (field === "rating") {
        const rating = Number(ps.rating || 0);
        if (Number.isNaN(rating) || rating < 0 || rating > 10) {
          return "playerStats.rating debe estar entre 0 y 10";
        }
      } else {
        const err = validatePercent(ps[field], `playerStats.${field}`);
        if (err) return err;
      }
    }

    if (Number(ps.shotsOnTarget || 0) > Number(ps.shots || 0)) {
      return "playerStats.shotsOnTarget no puede exceder shots";
    }

    if (Number(ps.passesCompleted || 0) > Number(ps.passes || 0)) {
      return "playerStats.passesCompleted no puede exceder passes";
    }

    if (Number(ps.tacklesWon || 0) > Number(ps.tackles || 0)) {
      return "playerStats.tacklesWon no puede exceder tackles";
    }

    if (Number(ps.dribblesWon || 0) > Number(ps.dribbles || 0)) {
      return "playerStats.dribblesWon no puede exceder dribbles";
    }

    const key = `${String(ps.user)}-${psClub}`;
    if (seen.has(key)) {
      return "Jugador duplicado en playerStats para el mismo club";
    }
    seen.add(key);

    const maxGoalsForClub =
      psClub === String(homeId) ? Number(scoreHome) : Number(scoreAway);

    const goals = Number(ps.goals || 0);
    const assists = Number(ps.assists || 0);

    if (goals > maxGoalsForClub) {
      return "Goles del jugador exceden los goles del club";
    }

    if (goals + assists > maxGoalsForClub) {
      return "Goles + asistencias exceden los goles del club";
    }

    if (ps.isMVP) mvpCount += 1;

    if (psClub === String(homeId)) {
      homeGoalsSum += goals;
      homeAssistsSum += assists;
    } else {
      awayGoalsSum += goals;
      awayAssistsSum += assists;
    }
  }

  if (mvpCount > 1) {
    return "Solo puede haber un MVP por partido";
  }

  if (homeAssistsSum > Number(scoreHome)) {
    return "Asistencias HOME exceden goles HOME";
  }

  if (awayAssistsSum > Number(scoreAway)) {
    return "Asistencias AWAY exceden goles AWAY";
  }

  if (strictTotals) {
    if (homeGoalsSum !== Number(scoreHome)) {
      return `HOME: la suma de goles (${homeGoalsSum}) no coincide con scoreHome (${scoreHome})`;
    }

    if (awayGoalsSum !== Number(scoreAway)) {
      return `AWAY: la suma de goles (${awayGoalsSum}) no coincide con scoreAway (${scoreAway})`;
    }
  }

  return null;
}

function validateLineupsAgainstClubs(lineups, homeId, awayId) {
  const allHome = lineups?.home?.players || [];
  const allAway = lineups?.away?.players || [];

  for (const p of allHome) {
    if (!p.user) return "lineups.home.players: falta user";
  }

  for (const p of allAway) {
    if (!p.user) return "lineups.away.players: falta user";
  }

  return null;
}

function getActingSide(actingClubId, homeId, awayId) {
  if (sameId(actingClubId, homeId)) return "home";
  if (sameId(actingClubId, awayId)) return "away";
  return "";
}

/**
 * =====================================================
 * CREATE MATCH
 * POST /matches/clubs/:clubId
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
      competition,
      status,
      teamStats,
      lineups,
      playerStats = [],
      strictTotals = true,
    } = req.body;

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

    if (
      !isValidObjectId(homeClub) ||
      !isValidObjectId(awayClub) ||
      !isValidObjectId(actingClubId)
    ) {
      return res.status(400).json({ message: "IDs de club inválidos" });
    }

    if (sameId(homeClub, awayClub)) {
      return res.status(400).json({
        message: "homeClub y awayClub no pueden ser el mismo club",
      });
    }

    if (!ensureActingClubParticipates(actingClubId, homeClub, awayClub)) {
      return res.status(403).json({
        message: "Tu club no participa en este partido",
      });
    }

    const parsedDate = parseMatchDate(date);
    if (!parsedDate) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    const home = await Club.findById(homeClub).select("_id");
    const away = await Club.findById(awayClub).select("_id");

    if (!home || !away) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const season = parsedDate.getFullYear();

    const normalizedTeamStats = {
      home: normalizeTeamStats(teamStats?.home || {}),
      away: normalizeTeamStats(teamStats?.away || {}),
    };

    const teamStatsHomeErr = validateTeamStats(normalizedTeamStats.home, "teamStats.home");
    if (teamStatsHomeErr) {
      return res.status(400).json({ message: teamStatsHomeErr });
    }

    const teamStatsAwayErr = validateTeamStats(normalizedTeamStats.away, "teamStats.away");
    if (teamStatsAwayErr) {
      return res.status(400).json({ message: teamStatsAwayErr });
    }

    const normalizedLineups = {
      home: normalizeLineup(lineups?.home || {}),
      away: normalizeLineup(lineups?.away || {}),
    };

    const lineupHomeErr = validateLineup(normalizedLineups.home, "lineups.home");
    if (lineupHomeErr) {
      return res.status(400).json({ message: lineupHomeErr });
    }

    const lineupAwayErr = validateLineup(normalizedLineups.away, "lineups.away");
    if (lineupAwayErr) {
      return res.status(400).json({ message: lineupAwayErr });
    }

    const lineupClubErr = validateLineupsAgainstClubs(normalizedLineups, homeClub, awayClub);
    if (lineupClubErr) {
      return res.status(400).json({ message: lineupClubErr });
    }

    const normalizedPlayerStats = normalizePlayerStats(playerStats);

    const playerStatsErr = validatePlayerStats(
      normalizedPlayerStats,
      homeClub,
      awayClub,
      scoreHome,
      scoreAway,
      strictTotals
    );

    if (playerStatsErr) {
      return res.status(400).json({ message: playerStatsErr });
    }

    const match = await Match.create({
      homeClub,
      awayClub,
      date: parsedDate,
      stadium: String(stadium).trim(),
      scoreHome: Number(scoreHome),
      scoreAway: Number(scoreAway),
      season,
      competition: competition ? String(competition).trim() : "League",
      status: status || "played",
      teamStats: normalizedTeamStats,
      lineups: normalizedLineups,
      playerStats: normalizedPlayerStats,
    });

    const populated = await Match.findById(match._id)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country")
      .populate("playerStats.user", "username gamerTag platform")
      .populate("lineups.home.players.user", "username gamerTag platform")
      .populate("lineups.away.players.user", "username gamerTag platform");

    return res.status(201).json(populated);
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
 * =====================================================
 */
exports.getMatches = async (req, res) => {
  try {
    const { season, club, from, to, stadium, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (season !== undefined) {
      const year = Number(season);
      if (isNaN(year)) return res.status(400).json({ message: "Season inválida" });
      filter.season = year;
    }

    if (club) {
      filter.$or = [{ homeClub: club }, { awayClub: club }];
    }

    if (stadium) filter.stadium = stadium;

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
 * MATCH FULL
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
      .populate("playerStats.user", "username gamerTag platform country")
      .populate("lineups.home.players.user", "username gamerTag platform country")
      .populate("lineups.away.players.user", "username gamerTag platform country");

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
 * HEAD TO HEAD
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
 * =====================================================
 */
exports.updateMatch = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;
    const { homeClub, awayClub, date, stadium, scoreHome, scoreAway, competition, status } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(actingClubId)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    const nextHomeClub = homeClub ?? match.homeClub;
    const nextAwayClub = awayClub ?? match.awayClub;

    if (sameId(nextHomeClub, nextAwayClub)) {
      return res.status(400).json({
        message: "homeClub y awayClub no pueden ser el mismo club",
      });
    }

    if (!ensureActingClubParticipates(actingClubId, nextHomeClub, nextAwayClub)) {
      return res.status(403).json({
        message: "Tu club no participa en este partido",
      });
    }

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

    if (stadium !== undefined) match.stadium = String(stadium).trim();
    if (scoreHome !== undefined) match.scoreHome = Number(scoreHome);
    if (scoreAway !== undefined) match.scoreAway = Number(scoreAway);
    if (competition !== undefined) match.competition = String(competition).trim();
    if (status !== undefined) match.status = status;

    if (date !== undefined) {
      const d = parseMatchDate(date);
      if (!d) {
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
 * PATCH TEAM STATS
 * PATCH /matches/:id/clubs/:clubId/team-stats
 * =====================================================
 */
exports.updateMatchTeamStats = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;
    const { teamStats } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(actingClubId)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    const homeId = match.homeClub.toString();
    const awayId = match.awayClub.toString();

    if (!ensureActingClubParticipates(actingClubId, homeId, awayId)) {
      return res.status(403).json({ message: "Tu club no participa en este partido" });
    }

    const normalizedTeamStats = {
      home: normalizeTeamStats(teamStats?.home || {}),
      away: normalizeTeamStats(teamStats?.away || {}),
    };

    const homeErr = validateTeamStats(normalizedTeamStats.home, "teamStats.home");
    if (homeErr) {
      return res.status(400).json({ message: homeErr });
    }

    const awayErr = validateTeamStats(normalizedTeamStats.away, "teamStats.away");
    if (awayErr) {
      return res.status(400).json({ message: awayErr });
    }

    match.teamStats = normalizedTeamStats;
    await match.save();

    return res.status(200).json({
      message: "teamStats actualizados",
      teamStats: match.teamStats,
    });
  } catch (error) {
    console.error("updateMatchTeamStats ERROR:", error);
    return res.status(500).json({ message: "Error al actualizar teamStats" });
  }
};

/**
 * =====================================================
 * PATCH LINEUPS
 * PATCH /matches/:id/clubs/:clubId/lineups
 * -----------------------------------------------------
 * Regla:
 * - solo se actualiza el lado del club actuante
 * - el lado rival se conserva intacto
 * =====================================================
 */
exports.updateMatchLineups = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;
    const { lineups } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(actingClubId)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: "Partido no encontrado" });

    const homeId = match.homeClub.toString();
    const awayId = match.awayClub.toString();

    if (!ensureActingClubParticipates(actingClubId, homeId, awayId)) {
      return res.status(403).json({ message: "Tu club no participa en este partido" });
    }

    const actingSide = getActingSide(actingClubId, homeId, awayId);
    if (!actingSide) {
      return res.status(403).json({ message: "No se pudo determinar el lado del club actuante" });
    }

    const incomingLineup = normalizeLineup(lineups?.[actingSide] || {});

    const lineupErr = validateLineup(incomingLineup, `lineups.${actingSide}`);
    if (lineupErr) {
      return res.status(400).json({ message: lineupErr });
    }

    match.lineups[actingSide] = incomingLineup;
    await match.save();

    const populated = await Match.findById(match._id)
      .populate("lineups.home.players.user", "username gamerTag platform")
      .populate("lineups.away.players.user", "username gamerTag platform");

    return res.status(200).json({
      message: "lineup actualizada",
      side: actingSide,
      lineups: populated.lineups,
    });
  } catch (error) {
    console.error("updateMatchLineups ERROR:", error);
    return res.status(500).json({ message: "Error al actualizar lineups" });
  }
};

/**
 * =====================================================
 * CALENDAR
 * =====================================================
 */
exports.getCalendar = async (req, res) => {
  try {
    const { season, type } = req.query;

    const year = Number(season);
    if (isNaN(year)) return res.status(400).json({ message: "Season inválida" });

    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    const filter = { season: year, date: { $gte: start, $lte: end } };

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
 * MVP DEL PARTIDO
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

    const explicitMVP = match.playerStats.find((ps) => ps.isMVP);
    if (explicitMVP) {
      return res.status(200).json({
        match: {
          id: match._id,
          homeClub: match.homeClub.name,
          awayClub: match.awayClub.name,
          score: `${match.scoreHome}-${match.scoreAway}`,
        },
        mvp: {
          userId: explicitMVP.user?._id || explicitMVP.user,
          username: explicitMVP.user?.username || "unknown",
          gamerTag: explicitMVP.user?.gamerTag || "",
          clubId: explicitMVP.club,
          goals: explicitMVP.goals || 0,
          assists: explicitMVP.assists || 0,
          rating: explicitMVP.rating || 0,
          points:
            Number(explicitMVP.goals || 0) * 2 +
            Number(explicitMVP.assists || 0) +
            Number(explicitMVP.rating || 0),
        },
      });
    }

    let winnerClubId = null;
    if (match.scoreHome > match.scoreAway) winnerClubId = match.homeClub._id.toString();
    else if (match.scoreAway > match.scoreHome) winnerClubId = match.awayClub._id.toString();

    const players = match.playerStats.map((ps) => {
      let points =
        Number(ps.goals || 0) * 2 +
        Number(ps.assists || 0) +
        Number(ps.rating || 0);

      if (winnerClubId) {
        if (String(ps.club) === winnerClubId) points += 1;
        else points -= 1;
      }

      return {
        userId: ps.user?._id || ps.user,
        username: ps.user?.username || "unknown",
        gamerTag: ps.user?.gamerTag || "",
        clubId: ps.club,
        goals: Number(ps.goals || 0),
        assists: Number(ps.assists || 0),
        rating: Number(ps.rating || 0),
        points,
      };
    });

    players.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return String(a.username).localeCompare(String(b.username));
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
 * PATCH /matches/:id/clubs/:clubId/player-stats
 * -----------------------------------------------------
 * Regla:
 * - solo se reemplazan los playerStats del club actuante
 * - se conservan intactos los del otro club
 * - strictTotals por defecto false porque el rival puede no tener detalle
 * =====================================================
 */
exports.updateMatchPlayerStats = async (req, res) => {
  try {
    const { id, clubId: actingClubId } = req.params;
    const { playerStats = [], strictTotals = false } = req.body;

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

    const normalizedPlayerStats = normalizePlayerStats(playerStats).map((ps) => ({
      ...ps,
      club: actingClubId,
    }));

    const playerStatsErr = validatePlayerStats(
      normalizedPlayerStats,
      homeId,
      awayId,
      match.scoreHome,
      match.scoreAway,
      strictTotals
    );

    if (playerStatsErr) {
      return res.status(400).json({ message: playerStatsErr });
    }

    const preservedOtherClubStats = (match.playerStats || []).filter(
      (ps) => String(ps.club) !== String(actingClubId)
    );

    match.playerStats = [...preservedOtherClubStats, ...normalizedPlayerStats];
    await match.save();

    const populated = await Match.findById(match._id)
      .populate("homeClub", "name country")
      .populate("awayClub", "name country")
      .populate("playerStats.user", "username gamerTag platform");

    return res.status(200).json({
      message: "playerStats actualizados",
      clubUpdated: actingClubId,
      match: populated,
    });
  } catch (error) {
    console.error("updateMatchPlayerStats ERROR:", error);
    return res.status(500).json({ message: "Error al actualizar playerStats" });
  }
};