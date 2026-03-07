const Match = require("../models/Match");

/**
 * =====================================================
 * STATS AVANZADAS DEL CLUB (local vs visita)
 * -----------------------------------------------------
 * Calcula:
 * - played total
 * - points total (3 win, 1 draw)
 * - desglose home/away: played, wins, goalsFor, goalsAgainst
 * - goalDifference total
 * - efficiency (% de puntos obtenidos vs máximo)
 *
 * Ruta:
 * GET /advanced-stats/clubs/:clubId
 * (la ruta exacta depende de tu router)
 * =====================================================
 */
exports.getAdvancedClubStats = async (req, res) => {
  try {
    const { clubId } = req.params;

    if (!clubId) {
      return res.status(400).json({ message: "Falta clubId en params" });
    }

    // Buscar partidos donde el club fue local o visita
    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }]
    });

    // Estructura base de retorno
    const stats = {
      played: 0,
      points: 0,

      home: {
        played: 0,
        wins: 0,
        goalsFor: 0,
        goalsAgainst: 0
      },

      away: {
        played: 0,
        wins: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }
    };

    // Recorremos partidos y acumulamos
    matches.forEach(match => {
      const isHome = match.homeClub.toString() === clubId;

      const gf = isHome ? match.scoreHome : match.scoreAway; // goals for
      const ga = isHome ? match.scoreAway : match.scoreHome; // goals against

      stats.played += 1;

      // Acumular por local / visita
      if (isHome) {
        stats.home.played += 1;
        stats.home.goalsFor += gf;
        stats.home.goalsAgainst += ga;
      } else {
        stats.away.played += 1;
        stats.away.goalsFor += gf;
        stats.away.goalsAgainst += ga;
      }

      // Puntos (3 win, 1 draw)
      if (gf > ga) {
        stats.points += 3;
        if (isHome) stats.home.wins += 1;
        else stats.away.wins += 1;
      } else if (gf === ga) {
        stats.points += 1;
      }
    });

    // Totales derivados
    const totalGF = stats.home.goalsFor + stats.away.goalsFor;
    const totalGA = stats.home.goalsAgainst + stats.away.goalsAgainst;
    const goalDifference = totalGF - totalGA;

    // Eficiencia: % puntos obtenidos / máximo posible
    const maxPoints = stats.played * 3;
    const efficiency = maxPoints > 0 ? Math.round((stats.points / maxPoints) * 100) : 0;

    return res.status(200).json({
      ...stats,
      goalDifference,
      efficiency
    });
  } catch (error) {
    console.error("getAdvancedClubStats ERROR:", error);
    return res.status(500).json({ message: "Error al obtener stats avanzadas" });
  }
};
