const Club = require("../models/Club");
const Match = require("../models/Match");

/**
 * =====================================================
 * HELPERS
 * =====================================================
 */
const toIdStr = (id) => id?.toString();

const parseDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getMatchSeason = (match) => {
  const seasonValue = Number(match?.season);
  if (Number.isFinite(seasonValue)) return seasonValue;

  const fallback = new Date(match?.date);
  if (Number.isNaN(fallback.getTime())) return null;

  return fallback.getFullYear();
};

const buildMatchFilter = ({ clubId, season, from, to }) => {
  const filter = {};

  // Prioridad absoluta: season
  if (season !== undefined && season !== null && season !== "") {
    const s = Number(season);

    if (Number.isNaN(s)) {
      return { __invalidSeason: true };
    }

    filter.season = s;
  } else {
    const fromDate = parseDateOrNull(from);
    const toDate = parseDateOrNull(to);

    if (from && !fromDate) return { __invalidDate: true, field: "from" };
    if (to && !toDate) return { __invalidDate: true, field: "to" };

    if (fromDate || toDate) {
      filter.date = {};

      if (fromDate) filter.date.$gte = fromDate;

      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }
  }

  if (clubId) {
    filter.$or = [{ homeClub: clubId }, { awayClub: clubId }];
  }

  return filter;
};

/* =====================================================
   STATS BÁSICAS POR CLUB
   GET /stats/:clubId?season=2026 | from=...&to=...
===================================================== */
exports.getClubStats = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const filter = buildMatchFilter({ clubId, season, from, to });

    if (filter.__invalidSeason) {
      return res.status(400).json({ message: "Season inválida" });
    }

    if (filter.__invalidDate) {
      return res.status(400).json({ message: `Fecha inválida en '${filter.field}'` });
    }

    const matches = await Match.find(filter);

    let played = 0,
      wins = 0,
      draws = 0,
      losses = 0;
    let goalsFor = 0,
      goalsAgainst = 0,
      points = 0;

    matches.forEach((m) => {
      played++;
      const isHome = toIdStr(m.homeClub) === toIdStr(clubId);
      const gf = isHome ? m.scoreHome : m.scoreAway;
      const ga = isHome ? m.scoreAway : m.scoreHome;

      goalsFor += gf;
      goalsAgainst += ga;

      if (gf > ga) {
        wins++;
        points += 3;
      } else if (gf === ga) {
        draws++;
        points += 1;
      } else losses++;
    });

    return res.json({
      club: { id: club._id, name: club.name },
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points,
      winRate: played ? Number(((wins / played) * 100).toFixed(2)) : 0,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error al obtener stats" });
  }
};

// 🏆 Tabla de posiciones
// GET /stats/league/table?season=2026
exports.getLeagueTable = async (req, res) => {
  try {
    const season = req.query.season;
    const filter = {};

    if (season !== undefined && season !== null && season !== "") {
      const s = Number(season);
      if (Number.isNaN(s)) return res.status(400).json({ message: "Season inválida" });
      filter.season = s;
    }

    const clubs = await Club.find();
    const matches = await Match.find(filter);

    const table = clubs.map((club) => {
      const clubIdStr = toIdStr(club._id);

      let played = 0, wins = 0, draws = 0, losses = 0;
      let goalsFor = 0, goalsAgainst = 0, points = 0;

      matches.forEach((match) => {
        const isHome = toIdStr(match.homeClub) === clubIdStr;
        const isAway = toIdStr(match.awayClub) === clubIdStr;
        if (!isHome && !isAway) return;

        played++;
        const gf = isHome ? match.scoreHome : match.scoreAway;
        const ga = isHome ? match.scoreAway : match.scoreHome;

        goalsFor += gf;
        goalsAgainst += ga;

        if (gf > ga) { wins++; points += 3; }
        else if (gf === ga) { draws++; points += 1; }
        else losses++;
      });

      return {
        clubId: club._id,
        clubName: club.name,
        played,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points,
      };
    });

    table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    return res.status(200).json(table);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al generar tabla de posiciones" });
  }
};

/* =====================================================
   STATS AVANZADAS POR CLUB
   GET /stats/club/:clubId/advanced?season=... | from/to
===================================================== */
exports.getAdvancedClubStats = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const filter = buildMatchFilter({ clubId, season, from, to });

    if (filter.__invalidSeason) {
      return res.status(400).json({ message: "Season inválida" });
    }

    if (filter.__invalidDate) {
      return res.status(400).json({ message: `Fecha inválida en '${filter.field}'` });
    }

    const matches = await Match.find(filter);

    let played = 0,
      goalsFor = 0,
      goalsAgainst = 0;
    let cleanSheets = 0,
      home = 0,
      away = 0;

    matches.forEach((m) => {
      const isHome = toIdStr(m.homeClub) === toIdStr(clubId);
      const gf = isHome ? m.scoreHome : m.scoreAway;
      const ga = isHome ? m.scoreAway : m.scoreHome;

      played++;
      goalsFor += gf;
      goalsAgainst += ga;

      if (ga === 0) cleanSheets++;
      isHome ? home++ : away++;
    });

    return res.json({
      club: { id: club._id, name: club.name },
      played,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      cleanSheets,
      matchesAsHome: home,
      matchesAsAway: away,
      averages: {
        goalsForPerMatch: played ? Number((goalsFor / played).toFixed(2)) : 0,
        goalsAgainstPerMatch: played ? Number((goalsAgainst / played).toFixed(2)) : 0,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error stats avanzadas" });
  }
};

// 📈 RANKING HISTORICO DE CLUB
exports.getHistoricalRanking = async (req, res) => {
  try {
    const clubs = await Club.find();
    const matches = await Match.find();

    const ranking = clubs.map((club) => {
      const clubIdStr = toIdStr(club._id);

      let played = 0, wins = 0, draws = 0, losses = 0;
      let goalsFor = 0, goalsAgainst = 0, points = 0;

      matches.forEach((match) => {
        const isHome = toIdStr(match.homeClub) === clubIdStr;
        const isAway = toIdStr(match.awayClub) === clubIdStr;
        if (!isHome && !isAway) return;

        played++;
        const gf = isHome ? match.scoreHome : match.scoreAway;
        const ga = isHome ? match.scoreAway : match.scoreHome;

        goalsFor += gf;
        goalsAgainst += ga;

        if (gf > ga) { wins++; points += 3; }
        else if (gf === ga) { draws++; points += 1; }
        else losses++;
      });

      const goalDifference = goalsFor - goalsAgainst;
      const efficiency = played === 0 ? 0 : Number(((points / (played * 3)) * 100).toFixed(2));

      return {
        clubId: club._id,
        clubName: club.name,
        played,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
        efficiency
      };
    });

    ranking.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.clubName.localeCompare(b.clubName);
    });

    return res.status(200).json(ranking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al generar ranking histórico" });
  }
};

// ⚔️ ENFRENTAMIENTOS DIRECTOS ENTRE DOS CLUBS (global)
exports.getHeadToHead = async (req, res) => {
  try {
    const { clubA, clubB } = req.params;
    const clubAStr = toIdStr(clubA);

    const clubAExists = await Club.findById(clubA);
    const clubBExists = await Club.findById(clubB);

    if (!clubAExists || !clubBExists) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const matches = await Match.find({
      $or: [
        { homeClub: clubA, awayClub: clubB },
        { homeClub: clubB, awayClub: clubA }
      ]
    });

    let played = 0, winsA = 0, winsB = 0, draws = 0, goalsA = 0, goalsB = 0;

    matches.forEach((m) => {
      played++;
      const isAHome = toIdStr(m.homeClub) === clubAStr;

      const gfA = isAHome ? m.scoreHome : m.scoreAway;
      const gfB = isAHome ? m.scoreAway : m.scoreHome;

      goalsA += gfA;
      goalsB += gfB;

      if (gfA > gfB) winsA++;
      else if (gfA < gfB) winsB++;
      else draws++;
    });

    return res.status(200).json({
      clubA: { id: clubAExists._id, name: clubAExists.name },
      clubB: { id: clubBExists._id, name: clubBExists.name },
      played,
      winsA,
      winsB,
      draws,
      goalsA,
      goalsB
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener H2H" });
  }
};

// 📊 ESTADISTICAS LOCAL/VISITANTE (simple)
exports.getHomeAwayStats = async (req, res) => {
  try {
    const { clubId } = req.params;
    const clubIdStr = toIdStr(clubId);

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }]
    });

    const initStats = () => ({
      played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0
    });

    const home = initStats();
    const away = initStats();

    matches.forEach((match) => {
      if (toIdStr(match.homeClub) === clubIdStr) {
        home.played++;
        home.goalsFor += match.scoreHome;
        home.goalsAgainst += match.scoreAway;

        if (match.scoreHome > match.scoreAway) { home.wins++; home.points += 3; }
        else if (match.scoreHome === match.scoreAway) { home.draws++; home.points += 1; }
        else home.losses++;
      }

      if (toIdStr(match.awayClub) === clubIdStr) {
        away.played++;
        away.goalsFor += match.scoreAway;
        away.goalsAgainst += match.scoreHome;

        if (match.scoreAway > match.scoreHome) { away.wins++; away.points += 3; }
        else if (match.scoreAway === match.scoreHome) { away.draws++; away.points += 1; }
        else away.losses++;
      }
    });

    return res.status(200).json({ club: club.name, home, away });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener stats local/visitante" });
  }
};

// 📈 PROMEDIOS DE UN CLUB
exports.getClubAverages = async (req, res) => {
  try {
    const { clubId } = req.params;
    const clubIdStr = toIdStr(clubId);

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }]
    });

    let played = 0, wins = 0, goalsFor = 0, goalsAgainst = 0, points = 0;

    matches.forEach((match) => {
      played++;
      const isHome = toIdStr(match.homeClub) === clubIdStr;

      const gf = isHome ? match.scoreHome : match.scoreAway;
      const ga = isHome ? match.scoreAway : match.scoreHome;

      goalsFor += gf;
      goalsAgainst += ga;

      if (gf > ga) { wins++; points += 3; }
      else if (gf === ga) { points += 1; }
    });

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      played,
      averages: {
        goalsForPerMatch: played ? Number((goalsFor / played).toFixed(2)) : 0,
        goalsAgainstPerMatch: played ? Number((goalsAgainst / played).toFixed(2)) : 0,
        pointsPerMatch: played ? Number((points / played).toFixed(2)) : 0,
        winRate: played ? Number(((wins / played) * 100).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener promedios del club" });
  }
};

// 📈 ESTADISTICAS POR TEMPORADA (usa season del Match)
exports.getClubSeasonStats = async (req, res) => {
  try {
    const { clubId, seasonYear } = req.params;
    const clubIdStr = toIdStr(clubId);
    const year = Number(seasonYear);

    if (Number.isNaN(year)) {
      return res.status(400).json({ message: "Temporada inválida" });
    }

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      season: year,
      $or: [{ homeClub: clubId }, { awayClub: clubId }]
    });

    let played = 0, wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0, points = 0;

    matches.forEach((match) => {
      played++;
      const isHome = toIdStr(match.homeClub) === clubIdStr;
      const gf = isHome ? match.scoreHome : match.scoreAway;
      const ga = isHome ? match.scoreAway : match.scoreHome;

      goalsFor += gf;
      goalsAgainst += ga;

      if (gf > ga) { wins++; points += 3; }
      else if (gf === ga) { draws++; points += 1; }
      else { losses++; }
    });

    return res.status(200).json({
      club: club.name,
      season: year,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener estadísticas por temporada" });
  }
};

// 📊 COMPARACION ENTRE TEMPORADAS (por date)
exports.getClubSeasonComparison = async (req, res) => {
  try {
    const { clubId } = req.params;
    const clubIdStr = toIdStr(clubId);

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }],
    });

    const seasons = {};

    matches.forEach((match) => {
      const year = getMatchSeason(match);
      if (!year) return;

      if (!seasons[year]) {
        seasons[year] = {
          season: year,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        };
      }

      const stats = seasons[year];
      stats.played++;

      const isHome = toIdStr(match.homeClub) === clubIdStr;
      const gf = isHome ? match.scoreHome : match.scoreAway;
      const ga = isHome ? match.scoreAway : match.scoreHome;

      stats.goalsFor += gf;
      stats.goalsAgainst += ga;

      if (gf > ga) {
        stats.wins++;
        stats.points += 3;
      } else if (gf === ga) {
        stats.draws++;
        stats.points += 1;
      } else {
        stats.losses++;
      }
    });

    const result = Object.values(seasons).sort((a, b) => a.season - b.season);

    return res.status(200).json({ club: club.name, seasons: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al comparar temporadas" });
  }
};

// 🥇 MEJORES TEMPORADAS
exports.getBestClubSeasons = async (req, res) => {
  try {
    const { clubId } = req.params;
    const clubIdStr = toIdStr(clubId);
    const limit = Number(req.query.limit) || 3;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }],
    });

    const seasons = {};

    matches.forEach((match) => {
      const year = getMatchSeason(match);
      if (!year) return;

      if (!seasons[year]) {
        seasons[year] = {
          season: year,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        };
      }

      const stats = seasons[year];
      stats.played++;

      const isHome = toIdStr(match.homeClub) === clubIdStr;
      const gf = isHome ? match.scoreHome : match.scoreAway;
      const ga = isHome ? match.scoreAway : match.scoreHome;

      stats.goalsFor += gf;
      stats.goalsAgainst += ga;

      if (gf > ga) {
        stats.wins++;
        stats.points += 3;
      } else if (gf === ga) {
        stats.draws++;
        stats.points += 1;
      } else {
        stats.losses++;
      }
    });

    const ranked = Object.values(seasons)
      .map((s) => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      })
      .slice(0, limit);

    return res.status(200).json({ club: club.name, bestSeasons: ranked });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener mejores temporadas" });
  }
};
// 📊 RANKING HISTÓRICO POR PROMEDIO DE PUNTOS
exports.getAveragePointsRanking = async (req, res) => {
  try {
    const clubs = await Club.find();
    const matches = await Match.find();

    const table = clubs.map((club) => {
      const clubIdStr = toIdStr(club._id);

      let played = 0, points = 0, goalsFor = 0, goalsAgainst = 0;

      matches.forEach((match) => {
        const isHome = toIdStr(match.homeClub) === clubIdStr;
        const isAway = toIdStr(match.awayClub) === clubIdStr;
        if (!isHome && !isAway) return;

        played++;
        const gf = isHome ? match.scoreHome : match.scoreAway;
        const ga = isHome ? match.scoreAway : match.scoreHome;

        goalsFor += gf;
        goalsAgainst += ga;

        if (gf > ga) points += 3;
        else if (gf === ga) points += 1;
      });

      return {
        clubId: club._id,
        clubName: club.name,
        played,
        points,
        avgPoints: played === 0 ? 0 : Number((points / played).toFixed(2)),
        goalDifference: goalsFor - goalsAgainst
      };
    });

    table.sort((a, b) => {
      if (b.avgPoints !== a.avgPoints) return b.avgPoints - a.avgPoints;
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDifference - a.goalDifference;
    });

    return res.status(200).json(table);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al generar ranking por promedio de puntos" });
  }
};

// 🏆 MEJOR Y PEOR TEMPORADA DE UN CLUB
exports.getBestWorstSeason = async (req, res) => {
  try {
    const { clubId } = req.params;
    const clubIdStr = toIdStr(clubId);

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }],
    });

    const seasons = {};

    matches.forEach((match) => {
      const year = getMatchSeason(match);
      if (!year) return;

      if (!seasons[year]) {
        seasons[year] = {
          season: year,
          played: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };
      }

      const isHome = toIdStr(match.homeClub) === clubIdStr;
      const gf = isHome ? match.scoreHome : match.scoreAway;
      const ga = isHome ? match.scoreAway : match.scoreHome;

      seasons[year].played++;
      seasons[year].goalsFor += gf;
      seasons[year].goalsAgainst += ga;

      if (gf > ga) seasons[year].points += 3;
      else if (gf === ga) seasons[year].points += 1;
    });

    const seasonList = Object.values(seasons);

    if (seasonList.length === 0) {
      return res.status(200).json({
        club: club.name,
        message: "El club no tiene temporadas registradas",
      });
    }

    seasonList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    });

    const bestSeason = seasonList[0];
    const worstSeason = seasonList[seasonList.length - 1];

    return res.status(200).json({
      club: club.name,
      bestSeason: {
        season: bestSeason.season,
        played: bestSeason.played,
        points: bestSeason.points,
        goalDifference: bestSeason.goalsFor - bestSeason.goalsAgainst,
      },
      worstSeason: {
        season: worstSeason.season,
        played: worstSeason.played,
        points: worstSeason.points,
        goalDifference: worstSeason.goalsFor - worstSeason.goalsAgainst,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al calcular mejores y peores temporadas" });
  }
};

// ⚔️ COMPARACION ENTRE DOS CLUBES POR TEMPORADA (A vs B REAL)
exports.compareClubsBySeason = async (req, res) => {
  try {
    const { clubA, clubB, season } = req.params;
    const year = Number(season);

    if (Number.isNaN(year)) return res.status(400).json({ message: "Temporada inválida" });

    const club1 = await Club.findById(clubA);
    const club2 = await Club.findById(clubB);
    if (!club1 || !club2) return res.status(404).json({ message: "Uno o ambos clubes no existen" });

    const matches = await Match.find({
      season: year,
      $or: [
        { homeClub: clubA, awayClub: clubB },
        { homeClub: clubB, awayClub: clubA }
      ]
    }).sort({ date: 1 });

    const init = (id, name) => ({
      id, name, played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0
    });

    const A = init(club1._id, club1.name);
    const B = init(club2._id, club2.name);
    const clubAStr = toIdStr(clubA);

    matches.forEach((m) => {
      const aIsHome = toIdStr(m.homeClub) === clubAStr;

      const aGF = aIsHome ? m.scoreHome : m.scoreAway;
      const aGA = aIsHome ? m.scoreAway : m.scoreHome;

      A.played++; B.played++;
      A.goalsFor += aGF; A.goalsAgainst += aGA;
      B.goalsFor += aGA; B.goalsAgainst += aGF;

      if (aGF > aGA) { A.wins++; A.points += 3; B.losses++; }
      else if (aGF < aGA) { B.wins++; B.points += 3; A.losses++; }
      else { A.draws++; A.points += 1; B.draws++; B.points += 1; }
    });

    return res.status(200).json({
      season: year,
      matches: matches.length,
      clubA: { ...A, goalDifference: A.goalsFor - A.goalsAgainst },
      clubB: { ...B, goalDifference: B.goalsFor - B.goalsAgainst }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al comparar clubes por temporada" });
  }
};

// 🔁 RACHAS DE UN CLUB
exports.getClubStreaks = async (req, res) => {
  try {
    const { clubId } = req.params;
    const clubIdStr = toIdStr(clubId);

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }]
    }).sort({ date: 1 });

    let winStreak = 0, drawStreak = 0, lossStreak = 0, unbeatenStreak = 0;
    let maxWins = 0, maxDraws = 0, maxLosses = 0, maxUnbeaten = 0;

    matches.forEach((match) => {
      const isHome = toIdStr(match.homeClub) === clubIdStr;
      const gf = isHome ? match.scoreHome : match.scoreAway;
      const ga = isHome ? match.scoreAway : match.scoreHome;

      if (gf > ga) { winStreak++; drawStreak = 0; lossStreak = 0; unbeatenStreak++; }
      else if (gf === ga) { drawStreak++; winStreak = 0; lossStreak = 0; unbeatenStreak++; }
      else { lossStreak++; winStreak = 0; drawStreak = 0; unbeatenStreak = 0; }

      maxWins = Math.max(maxWins, winStreak);
      maxDraws = Math.max(maxDraws, drawStreak);
      maxLosses = Math.max(maxLosses, lossStreak);
      maxUnbeaten = Math.max(maxUnbeaten, unbeatenStreak);
    });

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      streaks: { maxWins, maxDraws, maxLosses, maxUnbeaten }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener rachas del club" });
  }
};

/* =====================================================
   HOME / AWAY PRO
   GET /stats/club/:clubId/home-away-pro?season=... | from/to
===================================================== */
exports.getHomeAwayPro = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const filter = buildMatchFilter({ clubId, season, from, to });

    if (filter.__invalidSeason) {
      return res.status(400).json({ message: "Season inválida" });
    }

    if (filter.__invalidDate) {
      return res.status(400).json({ message: `Fecha inválida en '${filter.field}'` });
    }

    const matches = await Match.find(filter);

    const init = () => ({
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });

    const home = init();
    const away = init();

    matches.forEach((m) => {
      const isHome = toIdStr(m.homeClub) === toIdStr(clubId);
      const bucket = isHome ? home : away;
      const gf = isHome ? m.scoreHome : m.scoreAway;
      const ga = isHome ? m.scoreAway : m.scoreHome;

      bucket.played++;
      bucket.goalsFor += gf;
      bucket.goalsAgainst += ga;

      if (gf > ga) {
        bucket.wins++;
        bucket.points += 3;
      } else if (gf === ga) {
        bucket.draws++;
        bucket.points += 1;
      } else bucket.losses++;
    });

    const enrich = (s) => ({
      ...s,
      goalDifference: s.goalsFor - s.goalsAgainst,
      pointsPerMatch: s.played ? Number((s.points / s.played).toFixed(2)) : 0,
      winRate: s.played ? Number(((s.wins / s.played) * 100).toFixed(2)) : 0,
    });

    return res.json({
      club: { id: club._id, name: club.name },
      home: enrich(home),
      away: enrich(away),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error home/away pro" });
  }
};
// 📌 KPI DASHBOARD SUMMARY POR CLUB (ahora también soporta filtros)
exports.getClubSummary = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const filter = buildMatchFilter({ clubId, season, from, to });

    if (filter.__invalidSeason) {
      return res.status(400).json({ message: "Season inválida" });
    }

    if (filter.__invalidDate) {
      return res.status(400).json({ message: `Fecha inválida en '${filter.field}'` });
    }

    const matches = await Match.find(filter).sort({ date: 1 });

    let played = 0,
      wins = 0,
      draws = 0,
      losses = 0;
    let goalsFor = 0,
      goalsAgainst = 0,
      points = 0;

    const init = () => ({
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
    const home = init();
    const away = init();

    let winStreak = 0,
      drawStreak = 0,
      lossStreak = 0,
      unbeatenStreak = 0;
    let maxWins = 0,
      maxDraws = 0,
      maxLosses = 0,
      maxUnbeaten = 0;

    const seasons = {};

    matches.forEach((m) => {
      const isHome = toIdStr(m.homeClub) === toIdStr(clubId);
      const gf = isHome ? m.scoreHome : m.scoreAway;
      const ga = isHome ? m.scoreAway : m.scoreHome;

      played++;
      goalsFor += gf;
      goalsAgainst += ga;

      if (gf > ga) {
        wins++;
        points += 3;
      } else if (gf === ga) {
        draws++;
        points += 1;
      } else {
        losses++;
      }

      const bucket = isHome ? home : away;
      bucket.played++;
      bucket.goalsFor += gf;
      bucket.goalsAgainst += ga;
      if (gf > ga) {
        bucket.wins++;
        bucket.points += 3;
      } else if (gf === ga) {
        bucket.draws++;
        bucket.points += 1;
      } else {
        bucket.losses++;
      }

      if (gf > ga) {
        winStreak++;
        drawStreak = 0;
        lossStreak = 0;
        unbeatenStreak++;
      } else if (gf === ga) {
        drawStreak++;
        winStreak = 0;
        lossStreak = 0;
        unbeatenStreak++;
      } else {
        lossStreak++;
        winStreak = 0;
        drawStreak = 0;
        unbeatenStreak = 0;
      }

      maxWins = Math.max(maxWins, winStreak);
      maxDraws = Math.max(maxDraws, drawStreak);
      maxLosses = Math.max(maxLosses, lossStreak);
      maxUnbeaten = Math.max(maxUnbeaten, unbeatenStreak);

      const year = getMatchSeason(m);
      if (!year) return;

      if (!seasons[year]) {
        seasons[year] = {
          season: year,
          played: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };
      }

      seasons[year].played++;
      seasons[year].goalsFor += gf;
      seasons[year].goalsAgainst += ga;

      if (gf > ga) seasons[year].points += 3;
      else if (gf === ga) seasons[year].points += 1;
    });

    const goalDifference = goalsFor - goalsAgainst;

    const enrichHA = (s) => ({
      ...s,
      goalDifference: s.goalsFor - s.goalsAgainst,
      pointsPerMatch: s.played ? Number((s.points / s.played).toFixed(2)) : 0,
      winRate: s.played ? Number(((s.wins / s.played) * 100).toFixed(2)) : 0,
    });

    const seasonList = Object.values(seasons).map((s) => ({
      ...s,
      goalDifference: s.goalsFor - s.goalsAgainst,
    }));

    let bestSeason = null;
    let worstSeason = null;

    if (seasonList.length > 0) {
      seasonList.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      bestSeason = seasonList[0];
      worstSeason = seasonList[seasonList.length - 1];
    }

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      overall: {
        played,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
        winRate: played ? Number(((wins / played) * 100).toFixed(2)) : 0,
      },
      averages: {
        goalsForPerMatch: played ? Number((goalsFor / played).toFixed(2)) : 0,
        goalsAgainstPerMatch: played ? Number((goalsAgainst / played).toFixed(2)) : 0,
        pointsPerMatch: played ? Number((points / played).toFixed(2)) : 0,
      },
      home: enrichHA(home),
      away: enrichHA(away),
      streaks: { maxWins, maxDraws, maxLosses, maxUnbeaten },
      seasons: { bestSeason, worstSeason },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener summary del club" });
  }
};
/* =====================================================
   RIVALES
   GET /stats/club/:clubId/rivals?season=... | from/to&limit=5
===================================================== */
exports.getClubRivals = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { season, from, to, limit = 5 } = req.query;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const filter = buildMatchFilter({ clubId, season, from, to });
    if (filter.__invalidDate) {
      return res.status(400).json({ message: `Fecha inválida en '${filter.field}'` });
    }

    const matches = await Match.find(filter).sort({ date: -1 });

    const rivals = {};

    matches.forEach(m => {
      const isHome = toIdStr(m.homeClub) === toIdStr(clubId);
      const rivalId = toIdStr(isHome ? m.awayClub : m.homeClub);

      if (!rivals[rivalId]) {
        rivals[rivalId] = {
          rivalId,
          played: 0, wins: 0, draws: 0, losses: 0,
          goalsFor: 0, goalsAgainst: 0, points: 0,
          lastMatch: null
        };
      }

      const r = rivals[rivalId];
      const gf = isHome ? m.scoreHome : m.scoreAway;
      const ga = isHome ? m.scoreAway : m.scoreHome;

      r.played++;
      r.goalsFor += gf;
      r.goalsAgainst += ga;

      if (!r.lastMatch) {
        r.lastMatch = {
          matchId: m._id,
          date: m.date,
          homeClub: m.homeClub,
          awayClub: m.awayClub,
          scoreHome: m.scoreHome,
          scoreAway: m.scoreAway,
          stadium: m.stadium
        };
      }

      if (gf > ga) { r.wins++; r.points += 3; }
      else if (gf === ga) { r.draws++; r.points += 1; }
      else r.losses++;
    });

    return res.json({
      club: { id: club._id, name: club.name },
      rivals: Object.values(rivals)
        .sort((a, b) => b.played - a.played)
        .slice(0, Number(limit))
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error al obtener rivales" });
  }
};

// 🏟️ DASHBOARD DE LIGA
exports.getLeagueDashboard = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;

    const clubs = await Club.find();
    const matches = await Match.find().sort({ date: -1 });

    const table = {};
    clubs.forEach((c) => {
      table[c._id.toString()] = {
        clubId: c._id,
        clubName: c.name,
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0
      };
    });

    matches.forEach((m) => {
      const homeId = toIdStr(m.homeClub);
      const awayId = toIdStr(m.awayClub);

      const home = table[homeId];
      const away = table[awayId];
      if (!home || !away) return;

      home.played++; away.played++;

      home.goalsFor += m.scoreHome;
      home.goalsAgainst += m.scoreAway;

      away.goalsFor += m.scoreAway;
      away.goalsAgainst += m.scoreHome;

      if (m.scoreHome > m.scoreAway) { home.wins++; home.points += 3; away.losses++; }
      else if (m.scoreHome < m.scoreAway) { away.wins++; away.points += 3; home.losses++; }
      else { home.draws++; home.points += 1; away.draws++; away.points += 1; }
    });

    const ranking = Object.values(table)
      .map((t) => ({ ...t, goalDifference: t.goalsFor - t.goalsAgainst }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

    const topClubs = ranking.slice(0, limit);
    const bestAttack = [...ranking].sort((a, b) => b.goalsFor - a.goalsFor).slice(0, limit);
    const bestDefense = [...ranking].sort((a, b) => a.goalsAgainst - b.goalsAgainst).slice(0, limit);

    const lastMatches = matches.slice(0, limit).map((m) => {
      const homeId = toIdStr(m.homeClub);
      const awayId = toIdStr(m.awayClub);

      return {
        matchId: m._id,
        date: m.date,
        home: { id: homeId, name: table[homeId]?.clubName || "Desconocido" },
        away: { id: awayId, name: table[awayId]?.clubName || "Desconocido" },
        scoreHome: m.scoreHome,
        scoreAway: m.scoreAway,
        stadium: m.stadium
      };
    });

    return res.status(200).json({
      limit,
      league: { clubs: clubs.length, matches: matches.length },
      topClubs,
      bestAttack,
      bestDefense,
      lastMatches
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener dashboard de liga" });
  }
};

// 📈 TENDENCIAS DE LIGA POR TEMPORADA
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
    console.error(error);
    return res.status(500).json({ message: "Error al obtener trends de liga" });
  }
};
// ⚡ POWER RANKING (ponderado)
exports.getPowerRanking = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const last = Number(req.query.last) || 5;

    const clubs = await Club.find();
    const matches = await Match.find().sort({ date: -1 });

    const nameMap = {};
    clubs.forEach((c) => { nameMap[c._id.toString()] = c.name; });

    const init = (clubId) => ({
      clubId,
      clubName: nameMap[clubId] || "Desconocido",
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      lastMatches: []
    });

    const stats = {};
    clubs.forEach((c) => { stats[c._id.toString()] = init(c._id.toString()); });

    matches.forEach((m) => {
      const homeId = toIdStr(m.homeClub);
      const awayId = toIdStr(m.awayClub);

      const home = stats[homeId];
      const away = stats[awayId];
      if (!home || !away) return;

      home.played++; away.played++;
      home.goalsFor += m.scoreHome; home.goalsAgainst += m.scoreAway;
      away.goalsFor += m.scoreAway; away.goalsAgainst += m.scoreHome;

      let homePts = 0, awayPts = 0;
      if (m.scoreHome > m.scoreAway) { homePts = 3; awayPts = 0; }
      else if (m.scoreHome < m.scoreAway) { homePts = 0; awayPts = 3; }
      else { homePts = 1; awayPts = 1; }

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
        powerScore: score
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
      ranking: list.slice(0, limit)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener power ranking" });
  }
};
