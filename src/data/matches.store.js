/**
 * =====================================================
 * MATCH MEMORY STORE
 * -----------------------------------------------------
 * - Almacena partidos en memoria (NO persistente)
 * - Útil para pruebas, cache temporal o simulaciones
 * - Se reinicia cada vez que se reinicia el servidor
 * =====================================================
 */

let matches = [];

/**
 * -----------------------------------------------------
 * ADD MATCH
 * -----------------------------------------------------
 * Agrega un partido al store en memoria
 *
 * @param {Object} match - Objeto partido
 */
const addMatch = (match) => {
  if (!match || typeof match !== "object") {
    throw new Error("Match inválido");
  }

  matches.push(match);
};


/**
 * -----------------------------------------------------
 * GET MATCHES
 * -----------------------------------------------------
 * Retorna todos los partidos almacenados en memoria
 *
 * @returns {Array}
 */
const getMatches = () => {
  return matches;
};

module.exports = {
  addMatch,
  getMatches
};
