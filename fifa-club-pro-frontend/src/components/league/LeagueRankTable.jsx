// src/components/league/LeagueRankTable.jsx
function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

export default function LeagueRankTable({
  title,
  subtitle,
  metricLabel,
  rows = [],
  valueGetter,
  nameGetter,
  accent,
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-[var(--fifa-card)] shadow-glow ring-1 ring-[var(--fifa-line)]">
      <div className="border-b border-[var(--fifa-line)]/70 bg-black/20 px-5 py-4">
        <div
          className="text-xs font-semibold tracking-widest"
          style={{ color: accent }}
        >
          {title.toUpperCase()}
        </div>
        <div className="text-sm text-[var(--fifa-mute)]">{subtitle}</div>
      </div>

      <div className="p-5">
        {rows.length === 0 ? (
          <div className="text-[var(--fifa-mute)]">
            Aún no hay datos para esta temporada.
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full table-fixed border-collapse text-sm text-[var(--fifa-text)]">
              <thead>
                <tr className="bg-black">
                  <th className="w-12 px-2 py-3 text-center font-extrabold">#</th>
                  <th className="px-3 py-3 text-left font-extrabold">NOMBRE</th>
                  <th className="w-14 px-2 py-3 text-center font-extrabold">
                    {metricLabel}
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 5).map((row, idx) => {
                  const medal = getMedal(idx);

                  return (
                    <tr
                      key={row.userId || row.clubId || idx}
                      className={`border-b border-[var(--fifa-line)]/40 ${
                        idx === 0 ? "bg-[rgba(0,255,194,0.06)]" : ""
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
                          className="truncate font-extrabold"
                          title={nameGetter(row)}
                        >
                          {nameGetter(row)}
                        </div>
                      </td>

                      <td
                        className="px-2 py-3 text-center font-extrabold"
                        style={{ color: accent }}
                      >
                        {valueGetter(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}