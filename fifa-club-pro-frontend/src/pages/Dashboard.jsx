// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import LeagueHeader from "../components/league/LeagueHeader";
import LeagueMvpCard from "../components/league/LeagueMvpCard";
import LeagueTable from "../components/league/LeagueTable";
import LeagueRankTable from "../components/league/LeagueRankTable";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSeasons() {
      try {
        const res = await api.get("/league/seasons");
        if (!alive) return;

        const list = Array.isArray(res.data?.seasons) ? res.data.seasons : [];

        setSeasons(list);

        if (list.length > 0) {
          setSeason(String(list[0]));
        } else {
          setSeason("");
        }
      } catch {
        if (!alive) return;
        setSeasons([]);
        setSeason("");
      }
    }

    loadSeasons();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setErr("");

        const params = {};
        if (season) params.season = season;

        const res = await api.get("/league/dashboard", { params });
        if (!alive) return;

        setData(res.data);
      } catch (e) {
        if (!alive) return;
        setErr(
          e?.response?.data?.message ||
            e.message ||
            "Error al cargar dashboard"
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!season && seasons.length > 0) return;

    if (season || seasons.length === 0) {
      loadDashboard();
    }

    return () => {
      alive = false;
    };
  }, [season, seasons.length]);

  const table = useMemo(() => {
    const raw = Array.isArray(data?.table) ? data.table : [];

    return raw.map((row) => ({
      clubId: row.clubId ?? row._id ?? null,
      clubName: row.clubName ?? "—",
      played: Number(row.played ?? 0),
      wins: Number(row.wins ?? 0),
      draws: Number(row.draws ?? 0),
      losses: Number(row.losses ?? 0),
      goalsFor: Number(row.goalsFor ?? 0),
      goalsAgainst: Number(row.goalsAgainst ?? 0),
      goalDifference: Number(
        row.goalDifference ??
          (Number(row.goalsFor ?? 0) - Number(row.goalsAgainst ?? 0))
      ),
      points: Number(row.points ?? 0),
    }));
  }, [data]);

  const leader = table.length > 0 ? table[0] : null;

  const leaderboards = data?.leaderboards ?? {};
  const extras = data?.extras ?? {};

  const topScorers = Array.isArray(leaderboards.topScorers)
    ? leaderboards.topScorers
    : [];

  const topAssists = Array.isArray(leaderboards.topAssists)
    ? leaderboards.topAssists
    : [];

  const mvp = leaderboards.mvp ?? null;

  const bestAttack = Array.isArray(extras.bestAttack) ? extras.bestAttack : [];
  const bestDefense = Array.isArray(extras.bestDefense) ? extras.bestDefense : [];
  const cleanSheets = Array.isArray(extras.cleanSheets) ? extras.cleanSheets : [];

  if (loading) {
    return (
      <div className="rounded-2xl bg-black/30 p-6 text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)]">
        Cargando liga...
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl bg-black/30 p-6 text-[var(--fifa-danger)] ring-1 ring-[var(--fifa-danger)]/40">
        Error: {err}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 md:px-6">
      <LeagueHeader
        season={season}
        seasons={seasons}
        onSeasonChange={setSeason}
        clubCount={table.length}
        leaderName={leader?.clubName ?? "—"}
      />

      <LeagueMvpCard mvp={mvp} season={season} />

      <LeagueTable rows={table} />

      <section className="grid gap-4 lg:grid-cols-2">
        <LeagueRankTable
          title="Goleadores"
          subtitle="Máximos anotadores de la temporada"
          metricLabel="G"
          rows={topScorers}
          valueGetter={(r) => r.goals ?? 0}
          nameGetter={(r) => r.gamerTag || r.username || "—"}
          accent="var(--fifa-neon)"
        />

        <LeagueRankTable
          title="Asistencias"
          subtitle="Máximos asistentes de la temporada"
          metricLabel="A"
          rows={topAssists}
          valueGetter={(r) => r.assists ?? 0}
          nameGetter={(r) => r.gamerTag || r.username || "—"}
          accent="var(--fifa-cyan)"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <LeagueRankTable
          title="Mejor ataque"
          subtitle="Más goles a favor"
          metricLabel="GF"
          rows={bestAttack}
          valueGetter={(r) => r.goalsFor ?? 0}
          nameGetter={(r) => r.clubName || "—"}
          accent="var(--fifa-neon)"
        />

        <LeagueRankTable
          title="Mejor defensa"
          subtitle="Menos goles en contra"
          metricLabel="GC"
          rows={bestDefense}
          valueGetter={(r) => r.goalsAgainst ?? 0}
          nameGetter={(r) => r.clubName || "—"}
          accent="var(--fifa-cyan)"
        />

        <LeagueRankTable
          title="Vallas invictas"
          subtitle="Partidos sin recibir goles"
          metricLabel="CS"
          rows={cleanSheets}
          valueGetter={(r) => r.cleanSheets ?? 0}
          nameGetter={(r) => r.clubName || "—"}
          accent="var(--fifa-cyan)"
        />
      </section>
    </div>
  );
}