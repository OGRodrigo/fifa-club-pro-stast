const Club = require("../models/Club");
const Match = require("../models/Match");

/**
 * =====================================================
 * LEAGUE CONTROLLER
 * -----------------------------------------------------
 * Liga = todo lo global:
 * - dashboard
 * - tabla
 * - seasons
 * - trends
 * - power ranking
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

// Helper: orden de tabla
const sortTable = (a, b) => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  return b.goalsFor - a.goalsFor;
};

const toIdStr = (id) => id?.toString();

const getMatchSeason = (match) => {
  const seasonValue = Number(match?.season);
  if (Number.isFinite(seasonValue)) return seasonValue;

  const fallback = new Date(match?.date);
  if (Number.isNaN(fallback.getTime())) return null;

  return fallback.getFullYear();
};

/**
 * =====================================================
 * Leaderboards de liga
 * =====================================================
 */
const buildLeagueLeaderboards = (matches, limit = 10) => {
  const map = new Map();

  for (const m of matches) {
    const ps = Array.isArray(m.playerStats) ? m.playerStats : [];
    if (ps.length === 0) continue;

    let winnerClubId = null;
    if (Number(m.scoreHome) > Number(m.scoreAway)) {
      winnerClubId = m.homeClub?._id?.toString() || m.homeClub?.toString();
    } else if (Number(m.scoreAway) > Number(m.scoreHome)) {
      winnerClubId = m.awayClub?._id?.toString() || m.awayClub?.toString();
    }

    const seenThisMatch = new Set();

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
      agg.points += g * 2 + a;

      if (!seenThisMatch.has(uid)) {
        agg.played += 1;
        seenThisMatch.add(uid);
      }

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
      topScorers:
        topScorers.length === 0
          ? "Aún no hay goles registrados (playerStats vacío o sin goles)."
          : null,
      topAssists:
        topAssists.length === 0
          ? "Aún no hay asistencias registradas (playerStats vacío o sin asistencias)."
          : null,
      mvp: !mvp ? "Aún no hay MVP (playerStats vacío)." : null,
    },
  };
};

/**
 * =====================================================
 * Extras por club
 * =====================================================
 */
const buildClubExtras = ({ table, matches, limit = 5 }) => {
  const byClub = new Map();

  for (const row of table) {
    const id = row.clubId?.toString();
    if (!id) continue;
    byClub.set(id, { clubId: row.clubId, clubName: row.clubName, cleanSheets: 0 });
  }

  for (const m of matches) {
    const homeId = m.homeClub?._id?.toString() || m.homeClub?.toString();
    const awayId = m.awayClub?._id?.toString() || m.awayClub?.toString();
    if (!homeId || !awayId) continue;

    const homeGA = Number(m.scoreAway || 0);
    const awayGA = Number(m.scoreHome || 0);

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
 * =====================================================
 */
exports.getLeagueDashboard = async (req, res) => {
  try {
    const seasonParam = req.query?.season;
    const parsedSeason =
      seasonParam !== undefined && seasonParam !== "" ? Number(seasonParam) : null;

    if (
      seasonParam !== undefined &&
      seasonParam !== "" &&
      Number.isNaN(parsedSeason)
    ) {
      return res.status(400).json({
        message: "Query 'season' inválida (debe ser número, ej: 2026)",
      });
    }

    const [clubs, seasonsRaw] = await Promise.all([
      Club.find(),
      Match.distinct("season"),
    ]);

    const availableSeasons = seasonsRaw
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a);

    const seasonUsed =
      parsedSeason !== null
        ? parsedSeason
        : availableSeasons.length > 0
        ? availableSeasons[0]
        : null;

    const matchFilter = {};
    if (seasonUsed !== null) {
      matchFilter.season = seasonUsed;
    }

    const matches = await Match.find(matchFilter)
      .populate("homeClub", "name")
      .populate("awayClub", "name")
      .populate("playerStats.user", "username gamerTag")
      .sort({ date: -1 });

    const map = new Map();
    clubs.forEach((club) => {
      map.set(club._id.toString(), initRow(club));
    });

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
    const leaderboards = buildLeagueLeaderboards(matches, 10);
    const extras = buildClubExtras({ table, matches, limit: 5 });

    return res.status(200).json({
      season: seasonUsed,
      seasonUsed,
      availableSeasons,
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
 * GET /league/table?season=2026
 * =====================================================
 */
exports.getLeagueTable = async (req, res) => {
  try {
    const seasonParam = req.query?.season;
    const season =
      seasonParam !== undefined && seasonParam !== "" ? Number(seasonParam) : null;

    if (
      seasonParam !== undefined &&
      seasonParam !== "" &&
      Number.isNaN(season)
    ) {
      return res.status(400).json({ message: "Season inválida" });
    }

    const clubs = await Club.find();
    const filter = {};
    if (season !== null) filter.season = season;

    const matches = await Match.find(filter);

    const map = new Map();
    clubs.forEach((club) => {
      map.set(club._id.toString(), initRow(club));
    });

    matches.forEach((match) => {
      const homeId = toIdStr(match.homeClub);
      const awayId = toIdStr(match.awayClub);
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
      season,
      table,
    });
  } catch (error) {
    console.error("getLeagueTable ERROR:", error);
    return res.status(500).json({ message: "Error al generar tabla de posiciones" });
  }
};

/**
 * =====================================================
 * GET /league/table/:season
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

/**
 * =====================================================
 * GET /league/trends?from=2026&to=2028
 * =====================================================
 */
exports.getLeagueTrends = async (req, res) => {
  try {
    const from = Number(req.query.from);
    const to = Number(req.query.to);

    if (Number.isNaN(from) || Number.isNaN(to) || from > to) {
      return res.status(400).json({ message: "Rango inválido (from/to)" });
    }

    const clubs = await Club.find();
    const nameMap = {};
    clubs.forEach((c) => {
      nameMap[c._id.toString()] = c.name;
    });

    const matches = await Match.find({
      season: { $gte: from, $lte: to },
    }).sort({ date: 1 });

    const seasons = {};

    const ensureClubStats = (year, clubId) => {
      if (!seasons[year].table[clubId]) {
        seasons[year].table[clubId] = {
          clubId,
          clubName: nameMap[clubId] || "Desconocido",
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        };
      }
      return seasons[year].table[clubId];
    };

    matches.forEach((m) => {
      const year = getMatchSeason(m);
      if (!year || year < from || year > to) return;

      if (!seasons[year]) {
        seasons[year] = {
          season: year,
          matches: 0,
          totalGoals: 0,
          avgGoalsPerMatch: 0,
          table: {},
        };
      }

      seasons[year].matches++;
      seasons[year].totalGoals += m.scoreHome + m.scoreAway;

      const homeId = toIdStr(m.homeClub);
      const awayId = toIdStr(m.awayClub);

      const home = ensureClubStats(year, homeId);
      const away = ensureClubStats(year, awayId);

      home.played++;
      away.played++;
      home.goalsFor += m.scoreHome;
      home.goalsAgainst += m.scoreAway;
      away.goalsFor += m.scoreAway;
      away.goalsAgainst += m.scoreHome;

      if (m.scoreHome > m.scoreAway) {
        home.wins++;
        home.points += 3;
        away.losses++;
      } else if (m.scoreHome < m.scoreAway) {
        away.wins++;
        away.points += 3;
        home.losses++;
      } else {
        home.draws++;
        home.points += 1;
        away.draws++;
        away.points += 1;
      }
    });

    const result = Object.values(seasons)
      .sort((a, b) => a.season - b.season)
      .map((s) => {
        s.avgGoalsPerMatch = s.matches
          ? Number((s.totalGoals / s.matches).toFixed(2))
          : 0;

        const ranking = Object.values(s.table)
          .map((t) => ({ ...t, goalDifference: t.goalsFor - t.goalsAgainst }))
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          });

        const champion = ranking[0] || null;
        const bestAttack =
          [...ranking].sort((a, b) => b.goalsFor - a.goalsFor)[0] || null;
        const bestDefense =
          [...ranking].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0] || null;

        return {
          season: s.season,
          matches: s.matches,
          totalGoals: s.totalGoals,
          avgGoalsPerMatch: s.avgGoalsPerMatch,
          champion: champion
            ? {
                clubId: champion.clubId,
                clubName: champion.clubName,
                points: champion.points,
                goalDifference: champion.goalDifference,
              }
            : null,
          bestAttack: bestAttack
            ? {
                clubId: bestAttack.clubId,
                clubName: bestAttack.clubName,
                goalsFor: bestAttack.goalsFor,
              }
            : null,
          bestDefense: bestDefense
            ? {
                clubId: bestDefense.clubId,
                clubName: bestDefense.clubName,
                goalsAgainst: bestDefense.goalsAgainst,
              }
            : null,
        };
      });

    return res.status(200).json({ range: { from, to }, seasons: result });
  } catch (error) {
    console.error("getLeagueTrends ERROR:", error);
    return res.status(500).json({ message: "Error al obtener trends de liga" });
  }
};

/**
 * =====================================================
 * GET /league/power-ranking?limit=10&last=5
 * =====================================================
 */
exports.getPowerRanking = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const last = Number(req.query.last) || 5;

    const clubs = await Club.find();
    const matches = await Match.find().sort({ date: -1 });

    const nameMap = {};
    clubs.forEach((c) => {
      nameMap[c._id.toString()] = c.name;
    });

    const init = (clubId) => ({
      clubId,
      clubName: nameMap[clubId] || "Desconocido",
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      lastMatches: [],
    });

    const stats = {};
    clubs.forEach((c) => {
      stats[c._id.toString()] = init(c._id.toString());
    });

    matches.forEach((m) => {
      const homeId = toIdStr(m.homeClub);
      const awayId = toIdStr(m.awayClub);

      const home = stats[homeId];
      const away = stats[awayId];
      if (!home || !away) return;

      home.played++;
      away.played++;
      home.goalsFor += m.scoreHome;
      home.goalsAgainst += m.scoreAway;
      away.goalsFor += m.scoreAway;
      away.goalsAgainst += m.scoreHome;

      let homePts = 0;
      let awayPts = 0;

      if (m.scoreHome > m.scoreAway) {
        homePts = 3;
        awayPts = 0;
      } else if (m.scoreHome < m.scoreAway) {
        homePts = 0;
        awayPts = 3;
      } else {
        homePts = 1;
        awayPts = 1;
      }

      home.points += homePts;
      away.points += awayPts;

      if (home.lastMatches.length < last) home.lastMatches.push(homePts);
      if (away.lastMatches.length < last) away.lastMatches.push(awayPts);
    });

    const list = Object.values(stats).map((s) => {
      const gd = s.goalsFor - s.goalsAgainst;
      const ppm = s.played ? s.points / s.played : 0;
      const gdpm = s.played ? gd / s.played : 0;

      const pointsLast = s.lastMatches.reduce((a, b) => a + b, 0);
      const form = s.lastMatches.length > 0 ? pointsLast / (s.lastMatches.length * 3) : 0;

      const score = Number(((0.6 * ppm) + (0.25 * gdpm) + (0.15 * form)).toFixed(4));

      return {
        clubId: s.clubId,
        clubName: s.clubName,
        played: s.played,
        points: s.points,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: gd,
        ppm: Number(ppm.toFixed(2)),
        gdpm: Number(gdpm.toFixed(2)),
        lastN: s.lastMatches.length,
        pointsLastN: pointsLast,
        form: Number((form * 100).toFixed(2)),
        powerScore: score,
      };
    });

    list.sort((a, b) => {
      if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDifference - a.goalDifference;
    });

    return res.status(200).json({
      limit,
      last,
      weights: { ppm: 0.6, gdpm: 0.25, form: 0.15 },
      ranking: list.slice(0, limit),
    });
  } catch (error) {
    console.error("getPowerRanking ERROR:", error);
    return res.status(500).json({ message: "Error al obtener power ranking" });
  }
};