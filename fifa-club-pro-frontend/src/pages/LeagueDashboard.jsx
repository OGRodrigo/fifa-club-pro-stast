// src/pages/LeagueDashboard.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function LeagueDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // ✅ season selector
  const [season, setSeason] = useState(""); // string
  const [seasons, setSeasons] = useState([]); // number[]
  const [loading, setLoading] = useState(true);

  // 1) cargar seasons disponibles (preferimos que vengan desde /league/dashboard)
  //    pero como primera carga aún no tenemos data, consultamos /league/seasons si existe.
  useEffect(() => {
    let alive = true;

    async function loadSeasons() {
      try {
        setErr("");
        const res = await api.get("/league/seasons");
        const list = Array.isArray(res.data?.seasons) ? res.data.seasons : [];

        if (!alive) return;
        setSeasons(list);

        // default = season más reciente (backend ya viene desc)
        if (list.length > 0) setSeason(String(list[0]));
      } catch (e) {
        // Si NO tienes /league/seasons implementado, no rompemos la UI.
        // Solo dejamos seasons vacío y dependemos del backend /league/dashboard.
        if (!alive) return;
        // No seteamos err aquí para no bloquear la página si dashboard igual funciona.
        console.warn("[LeagueDashboard] /league/seasons not available:", e?.message);
      }
    }

    loadSeasons();
    return () => {
      alive = false;
    };
  }, []);

  // 2) cargar dashboard filtrado por season
  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setErr("");

        // Si no tenemos season aún, pedimos dashboard sin season (backend debería usar latest)
        const url = season ? `/league/dashboard?season=${encodeURIComponent(season)}` : "/league/dashboard";
        const res = await api.get(url);

        if (!alive) return;

        setData(res.data);

        // Si backend devuelve availableSeasons y aún no tenemos lista, la usamos
        const avail = Array.isArray(res.data?.availableSeasons) ? res.data.availableSeasons : [];
        if (avail.length > 0) {
          setSeasons(avail);

          // Si no había season seleccionada, usa la que backend usó
          if (!season && res.data?.seasonUsed) {
            setSeason(String(res.data.seasonUsed));
          }
        }

        // Si backend usó una season distinta a la seleccionada (por ejemplo, season inválida),
        // reflejamos seasonUsed como fuente de verdad.
        if (res.data?.seasonUsed && String(res.data.seasonUsed) !== String(season || "")) {
          // Solo si season estaba vacío o si backend impuso una diferente
          if (!season) setSeason(String(res.data.seasonUsed));
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [season]);

  if (err) return <div className="p-6">Error: {err}</div>;
  if (loading && !data) return <div className="p-6">Cargando...</div>;

  const table = Array.isArray(data?.table) ? data.table : [];
  const recentMatches = Array.isArray(data?.recentMatches) ? data.recentMatches : [];

  const seasonUsed = data?.seasonUsed ?? (season ? Number(season) : null);
  const seasonsList = Array.isArray(seasons) ? seasons : [];

  return (
    <div className="p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Tablero de instrumentos de la Liga</h1>
        <p className="text-gray-600">Ranking y últimos partidos</p>

        {/* ✅ Selector temporada */}
        <div className="flex items-end gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Temporada</div>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              disabled={seasonsList.length === 0}
            >
              {seasonsList.length === 0 ? (
                <option value="">Sin temporadas</option>
              ) : (
                seasonsList.map((s) => (
                  <option key={s} value={String(s)}>
                    {s}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="text-xs text-gray-500">
            Usando: <b>{seasonUsed ?? "—"}</b>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tabla de posiciones</h2>

        <div className="overflow-auto border rounded-lg">
          <table className="league-table min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3 w-12">#</th>
                <th className="p-3">Club</th>
                <th className="p-3 text-right">PJ</th>
                <th className="p-3 text-right">G</th>
                <th className="p-3 text-right">E</th>
                <th className="p-3 text-right">P</th>
                <th className="p-3 text-right">GF</th>
                <th className="p-3 text-right">GC</th>
                <th className="p-3 text-right">DG</th>
                <th className="p-3 text-right font-semibold">Pts</th>
              </tr>
            </thead>

            <tbody>
              {table.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-600" colSpan={10}>
                    No hay datos en la tabla para esta temporada.
                  </td>
                </tr>
              ) : (
                table.map((row, idx) => (
                  <tr key={row.clubId} className="border-t">
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3 font-medium">{row.clubName}</td>
                    <td className="p-3 text-right">{row.played}</td>
                    <td className="p-3 text-right">{row.wins}</td>
                    <td className="p-3 text-right">{row.draws}</td>
                    <td className="p-3 text-right">{row.losses}</td>
                    <td className="p-3 text-right">{row.goalsFor}</td>
                    <td className="p-3 text-right">{row.goalsAgainst}</td>
                    <td className="p-3 text-right">{row.goalDifference}</td>
                    <td className="p-3 text-right font-semibold">{row.points}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Partidos recientes</h2>

        {recentMatches.length === 0 ? (
          <div className="text-gray-600">No hay partidos recientes.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentMatches.map((m) => {
              const homeName = m.homeClub?.name || "Home";
              const awayName = m.awayClub?.name || "Away";
              const date = m.date ? new Date(m.date).toLocaleDateString() : "—";

              return (
                <div
                  key={m._id}
                  className="match-card border rounded-2xl p-4 ring-1 ring-[var(--fifa-line)]"
                >
                  <div className="text-gray-600 text-xs">
                    {date} • Season {m.season ?? "—"}
                  </div>

                  <div className="mt-2 font-semibold">
                    {homeName} <span className="mx-2">vs</span> {awayName}
                  </div>

                  <div className="mt-1 text-2xl font-bold">
                    {m.scoreHome} - {m.scoreAway}
                  </div>

                  <div className="mt-2 text-sm text-gray-600">{m.stadium || "—"}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}