const Match = require("../models/Match");

/**
 * =====================================================
 * AUDIT: Matches sospechosos
 * -----------------------------------------------------
 * GET /audit/suspicious-matches?season=2029&threshold=10
 * - threshold: goles/asistencias máximo por jugador (default 10)
 * =====================================================
 */
exports.getSuspiciousMatches = async (req, res) => {
  try {
    const { season, threshold = 10 } = req.query;

    const thr = Number(threshold);
    if (isNaN(thr) || thr < 1 || thr > 999) {
      return res.status(400).json({ message: "threshold inválido" });
    }

    const filter = {};
    if (season !== undefined) {
      const year = Number(season);
      if (isNaN(year)) return res.status(400).json({ message: "Season inválida" });
      filter.season = year;
    }

    // 1) casos extremos por jugador (ej goals > 10 o assists > 10)
    const extremeMatches = await Match.find({
      ...filter,
      $or: [
        { "playerStats.goals": { $gt: thr } },
        { "playerStats.assists": { $gt: thr } }
      ]
    })
      .populate("homeClub", "name")
      .populate("awayClub", "name")
      .populate("playerStats.user", "username");

    // 2) revisar coherencia contrib <= goles del club (más caro, pero exacto)
    const incoherent = [];
    for (const m of extremeMatches) {
      const homeId = m.homeClub?._id?.toString() || m.homeClub?.toString();
      const awayId = m.awayClub?._id?.toString() || m.awayClub?.toString();

      for (const ps of (m.playerStats || [])) {
        const clubId = ps.club.toString();
        const maxGoals = clubId === homeId ? m.scoreHome : m.scoreAway;
        const contrib = Number(ps.goals || 0) + Number(ps.assists || 0);

        if (contrib > maxGoals) {
          incoherent.push({
            matchId: m._id,
            date: m.date,
            season: m.season,
            home: m.homeClub?.name,
            away: m.awayClub?.name,
            score: `${m.scoreHome}-${m.scoreAway}`,
            player: ps.user?.username || ps.user?.toString(),
            playerGoals: ps.goals || 0,
            playerAssists: ps.assists || 0,
            playerClubId: clubId,
            maxGoalsForClub: maxGoals
          });
        }
      }
    }

    return res.status(200).json({
      season: season !== undefined ? Number(season) : null,
      threshold: thr,
      extremeMatchesCount: extremeMatches.length,
      incoherentCount: incoherent.length,
      incoherent
    });
  } catch (err) {
    console.error("getSuspiciousMatches ERROR:", err);
    return res.status(500).json({ message: "Error en auditoría" });
  }
};
