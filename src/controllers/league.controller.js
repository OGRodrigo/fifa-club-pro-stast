// src/controllers/league.controller.js
const Club = require("../models/Club");
const Match = require("../models/Match");

/**
 * =====================================================
 * LEAGUE CONTROLLER
 * -----------------------------------------------------
 * - Dashboard general: tabla + últimos partidos + leaderboards
 * - Soporta filtro por temporada via query: ?season=2026
 * =====================================================
 */

// Helper: inicializa fila de tabla
const initRow = (club) => ({
  clubId: club._id,
  clubName: club.name,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

// Helper: orden de tabla (ranking)
const sortTable = (a, b) => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  return b.goalsFor - a.goalsFor;
};

/**
 * =====================================================
 * Leaderboards LIGA (todos los clubes)
 * -----------------------------------------------------
 * - topScorers: por goals
 * - topAssists: por assists
 * - mvp: por points (g*2 + a) + bonus win/loss basado en match result
 *
 * IMPORTANTE:
 * - Usa Match.playerStats (si están vacíos, vendrá todo vacío)
 * =====================================================
 */
const buildLeagueLeaderboards = (matches, limit = 10) => {
  const map = new Map(); // userId -> row

  for (const m of matches) {
    const ps = Array.isArray(m.playerStats) ? m.playerStats : [];
    if (ps.length === 0) continue;

    // winner club id (para bonus de puntos)
    let winnerClubId = null;
    if (Number(m.scoreHome) > Number(m.scoreAway)) {
      winnerClubId = m.homeClub?._id?.toString() || m.homeClub?.toString();
    } else if (Number(m.scoreAway) > Number(m.scoreHome)) {
      winnerClubId = m.awayClub?._id?.toString() || m.awayClub?.toString();
    }

    // Para played por match (solo si el jugador aparece en este match)
    const seenThisMatch = new Set(); // userId

    for (const row of ps) {
      const uid = row.user?._id ? row.user._id.toString() : row.user?.toString();
      if (!uid) continue;

      const username = row.user?.username || "unknown";
      const gamerTag = row.user?.gamerTag || null;
      const clubId = row.club?._id ? row.club._id.toString() : row.club?.toString();

      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          username,
          gamerTag,
          played: 0,
          goals: 0,
          assists: 0,
          contrib: 0,
          points: 0,
        });
      }

      const agg = map.get(uid);
      const g = Number(row.goals || 0);
      const a = Number(row.assists || 0);

      agg.goals += g;
      agg.assists += a;
      agg.contrib += g + a;

      // points base
      agg.points += g * 2 + a;

      if (!seenThisMatch.has(uid)) {
        agg.played += 1;
        seenThisMatch.add(uid);
      }

      // Bonus por resultado (solo si hay winner)
      // +1 si el club del jugador fue el ganador, -1 si perdió
      if (winnerClubId && clubId) {
        if (clubId === winnerClubId) agg.points += 1;
        else agg.points -= 1;
      }
    }
  }

  const players = Array.from(map.values());

  const topScorers = [...players]
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.played - a.played)
    .slice(0, limit);

  const topAssists = [...players]
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.played - a.played)
    .slice(0, limit);

  const mvp = players.length
    ? [...players].sort(
        (a, b) =>
          b.points - a.points ||
          b.goals - a.goals ||
          b.assists - a.assists ||
          b.played - a.played
      )[0]
    : null;

  return {
    topScorers,
    topAssists,
    mvp,
    notes: {
      topScorers: topScorers.length === 0 ? "Aún no hay goles registrados (playerStats vacío o sin goles)." : null,
      topAssists: topAssists.length === 0 ? "Aún no hay asistencias registradas (playerStats vacío o sin asistencias)." : null,
      mvp: !mvp ? "Aún no hay MVP (playerStats vacío)." : null,
    },
  };
};

/**
 * =====================================================
 * EXTRA: Rankings por club (attack/defense/clean sheets)
 * -----------------------------------------------------
 * - bestAttack: más GF
 * - bestDefense: menos GC (con PJ > 0)
 * - cleanSheets: partidos con GC = 0 (por club)
 * =====================================================
 */
const buildClubExtras = ({ table, matches, limit = 5 }) => {
  const byClub = new Map(); // clubId -> { cleanSheets }

  // Inicializa cleanSheets = 0 para todos los clubes que existan en table
  for (const row of table) {
    const id = row.clubId?.toString();
    if (!id) continue;
    byClub.set(id, { clubId: row.clubId, clubName: row.clubName, cleanSheets: 0 });
  }

  // Cuenta clean sheets por club desde matches
  for (const m of matches) {
    const homeId = m.homeClub?._id?.toString() || m.homeClub?.toString();
    const awayId = m.awayClub?._id?.toString() || m.awayClub?.toString();
    if (!homeId || !awayId) continue;

    const homeGA = Number(m.scoreAway || 0); // goles que recibió home
    const awayGA = Number(m.scoreHome || 0); // goles que recibió away

    if (homeGA === 0 && byClub.has(homeId)) byClub.get(homeId).cleanSheets += 1;
    if (awayGA === 0 && byClub.has(awayId)) byClub.get(awayId).cleanSheets += 1;
  }

  const bestAttack = [...table]
    .sort((a, b) => b.goalsFor - a.goalsFor || b.points - a.points)
    .slice(0, limit);

  const bestDefense = [...table]
    .filter((r) => Number(r.played || 0) > 0)
    .sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.points - a.points)
    .slice(0, limit);

  const cleanSheets = Array.from(byClub.values())
    .sort((a, b) => b.cleanSheets - a.cleanSheets || a.clubName.localeCompare(b.clubName))
    .slice(0, limit);

  return { bestAttack, bestDefense, cleanSheets };
};

/**
 * =====================================================
 * GET /league/dashboard
 * -----------------------------------------------------
 * Query:
 *  - season=2026 (opcional) -> filtra TODO por temporada
 *
 * Devuelve:
 * - table (top 10)
 * - recentMatches (últimos 8)
 * - leaderboards (goleadores / asistencias / mvp)
 * - extras (bestAttack / bestDefense / cleanSheets) ✅ NUEVO
 * =====================================================
 */
exports.getLeagueDashboard = async (req, res) => {
  try {
    const seasonParam = req.query?.season;
    const season = seasonParam !== undefined && seasonParam !== "" ? Number(seasonParam) : null;

    if (seasonParam !== undefined && seasonParam !== "" && Number.isNaN(season)) {
      return res.status(400).json({ message: "Query 'season' inválida (debe ser número, ej: 2026)" });
    }

    const clubs = await Club.find();

    const matchFilter = {};
    if (season !== null) matchFilter.season = season;

    // Matches para tabla + recientes + leaderboards
    const matches = await Match.find(matchFilter)
      .populate("homeClub", "name")
      .populate("awayClub", "name")
      .populate("playerStats.user", "username gamerTag")
      .sort({ date: -1 });

    // Mapa clubId -> fila acumulada
    const map = new Map();
    clubs.forEach((club) => {
      map.set(club._id.toString(), initRow(club));
    });

    // Acumular stats de tabla
    matches.forEach((match) => {
      const homeId = match.homeClub?._id?.toString();
      const awayId = match.awayClub?._id?.toString();

      if (!homeId || !awayId) return;

      const homeRow = map.get(homeId);
      const awayRow = map.get(awayId);
      if (!homeRow || !awayRow) return;

      const homeGoals = Number(match.scoreHome || 0);
      const awayGoals = Number(match.scoreAway || 0);

      homeRow.played += 1;
      awayRow.played += 1;

      homeRow.goalsFor += homeGoals;
      homeRow.goalsAgainst += awayGoals;

      awayRow.goalsFor += awayGoals;
      awayRow.goalsAgainst += homeGoals;

      if (homeGoals > awayGoals) {
        homeRow.wins += 1;
        homeRow.points += 3;
        awayRow.losses += 1;
      } else if (homeGoals < awayGoals) {
        awayRow.wins += 1;
        awayRow.points += 3;
        homeRow.losses += 1;
      } else {
        homeRow.draws += 1;
        awayRow.draws += 1;
        homeRow.points += 1;
        awayRow.points += 1;
      }
    });

    const table = Array.from(map.values()).map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }));

    table.sort(sortTable);

    const recentMatches = matches.slice(0, 8);

    // Leaderboards LIGA
    const leaderboards = buildLeagueLeaderboards(matches, 10);

    // ✅ NUEVO: extras por club
    const extras = buildClubExtras({ table, matches, limit: 5 });

    return res.status(200).json({
      season: season ?? null,
      table: table.slice(0, 10),
      recentMatches,
      leaderboards,
      extras,
    });
  } catch (err) {
    console.error("getLeagueDashboard ERROR:", err);
    return res.status(500).json({ message: "Error al obtener dashboard de liga" });
  }
};

/**
 * =====================================================
 * GET /league/table/:season
 * -----------------------------------------------------
 * Devuelve tabla completa para una season.
 * =====================================================
 */
exports.getLeagueTableBySeason = async (req, res) => {
  try {
    const year = Number(req.params.season);
    if (Number.isNaN(year)) {
      return res.status(400).json({ message: "Season inválida" });
    }

    const clubs = await Club.find();
    const matches = await Match.find({ season: year });

    const map = new Map();
    clubs.forEach((club) => {
      map.set(club._id.toString(), initRow(club));
    });

    matches.forEach((match) => {
      const homeId = match.homeClub?.toString();
      const awayId = match.awayClub?.toString();
      if (!homeId || !awayId) return;

      const homeRow = map.get(homeId);
      const awayRow = map.get(awayId);
      if (!homeRow || !awayRow) return;

      const homeGoals = Number(match.scoreHome || 0);
      const awayGoals = Number(match.scoreAway || 0);

      homeRow.played += 1;
      awayRow.played += 1;

      homeRow.goalsFor += homeGoals;
      homeRow.goalsAgainst += awayGoals;

      awayRow.goalsFor += awayGoals;
      awayRow.goalsAgainst += homeGoals;

      if (homeGoals > awayGoals) {
        homeRow.wins += 1;
        homeRow.points += 3;
        awayRow.losses += 1;
      } else if (homeGoals < awayGoals) {
        awayRow.wins += 1;
        awayRow.points += 3;
        homeRow.losses += 1;
      } else {
        homeRow.draws += 1;
        awayRow.draws += 1;
        homeRow.points += 1;
        awayRow.points += 1;
      }
    });

    const table = Array.from(map.values()).map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }));

    table.sort(sortTable);

    return res.status(200).json({
      season: year,
      table,
    });
  } catch (err) {
    console.error("getLeagueTableBySeason ERROR:", err);
    return res.status(500).json({ message: "Error al generar tabla por temporada" });
  }
};

/**
 * =====================================================
 * GET /league/seasons
 * -----------------------------------------------------
 * Devuelve temporadas disponibles según Match.season
 * =====================================================
 */
exports.getLeagueSeasons = async (req, res) => {
  try {
    const seasons = await Match.distinct("season");

    const clean = seasons
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a);

    return res.status(200).json({ seasons: clean });
  } catch (err) {
    console.error("getLeagueSeasons ERROR:", err);
    return res.status(500).json({ message: "Error al obtener temporadas" });
  }
};