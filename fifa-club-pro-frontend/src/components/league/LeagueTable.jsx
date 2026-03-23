// src/components/league/LeagueTable.jsx
function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

export default function LeagueTable({ rows = [] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-[var(--fifa-card)] shadow-glow ring-1 ring-[var(--fifa-line)]">
      <div className="border-b border-[var(--fifa-line)]/70 bg-black/20 px-5 py-4">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
          TABLA DE POSICIONES
        </div>
        <div className="text-sm text-[var(--fifa-mute)]">
          Ranking oficial de la temporada
        </div>
      </div>

      <div className="p-5 md:p-6">
        {rows.length === 0 ? (
          <div className="text-[var(--fifa-mute)]">
            No hay datos en la tabla.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm text-[var(--fifa-text)]">
              <thead>
                <tr className="bg-black text-[var(--fifa-text)]">
                  <th className="w-12 px-2 py-3 text-center font-extrabold">#</th>
                  <th className="w-[46%] px-3 py-3 text-left font-extrabold">
                    CLUB
                  </th>
                  <th className="w-10 px-1 py-3 text-center font-extrabold">PJ</th>
                  <th className="w-8 px-1 py-3 text-center font-extrabold">G</th>
                  <th className="w-8 px-1 py-3 text-center font-extrabold">E</th>
                  <th className="w-8 px-1 py-3 text-center font-extrabold">P</th>
                  <th className="w-10 px-1 py-3 text-center font-extrabold">GF</th>
                  <th className="w-10 px-1 py-3 text-center font-extrabold">GC</th>
                  <th className="w-10 px-1 py-3 text-center font-extrabold">DG</th>
                  <th className="w-12 px-1 py-3 text-center font-extrabold text-[var(--fifa-cyan)]">
                    PTS
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, idx) => {
                  const isLeader = idx === 0;
                  const medal = getMedal(idx);

                  return (
                    <tr
                      key={row.clubId || `${row.clubName}-${idx}`}
                      className={`border-b border-[var(--fifa-line)]/40 ${
                        isLeader ? "bg-[rgba(0,255,194,0.06)]" : ""
                      }`}
                    >
                      <td className="px-2 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>{idx + 1}</span>
                          {medal ? <span>{medal}</span> : null}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div
                          className={`truncate font-extrabold ${
                            isLeader ? "text-[var(--fifa-neon)]" : ""
                          }`}
                          title={row.clubName}
                        >
                          {row.clubName}
                        </div>
                      </td>

                      <td className="px-1 py-3 text-center">{row.played}</td>
                      <td className="px-1 py-3 text-center">{row.wins}</td>
                      <td className="px-1 py-3 text-center">{row.draws}</td>
                      <td className="px-1 py-3 text-center">{row.losses}</td>
                      <td className="px-1 py-3 text-center">{row.goalsFor}</td>
                      <td className="px-1 py-3 text-center">{row.goalsAgainst}</td>
                      <td className="px-1 py-3 text-center">
                        {row.goalDifference}
                      </td>
                      <td className="px-1 py-3 text-center font-extrabold text-[var(--fifa-cyan)]">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}