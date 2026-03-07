import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/client";
import { useNavigate } from "react-router-dom";

export default function HomeMember() {
  const { user, clubContext } = useAuth();
  const navigate = useNavigate();

  const clubId = clubContext?.clubId || "";
  const displayName = user?.gamerTag || user?.username || "usuario";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");

  const [myStats, setMyStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);

  // =========================
  // Cargar temporadas
  // =========================
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
          setSeason(String(new Date().getFullYear()));
        }
      } catch (e) {
        if (!alive) return;
        setSeasons([]);
        setSeason(String(new Date().getFullYear()));
      }
    }

    loadSeasons();

    return () => {
      alive = false;
    };
  }, []);

  // =========================
  // Cargar stats del miembro + últimos partidos del club
  // =========================
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!clubId || !season) return;

      setLoading(true);
      setErr("");

      try {
        const [statsRes, matchesRes] = await Promise.all([
          api.get(`/clubs/${clubId}/players/me/stats`, {
            params: { season },
          }),
          api.get("/matches", {
            params: {
              season,
              club: clubId,
              page: 1,
              limit: 5,
            },
          }),
        ]);

        if (!alive) return;

        setMyStats(statsRes.data || null);
        setRecentMatches(
          Array.isArray(matchesRes.data?.data) ? matchesRes.data.data : []
        );
      } catch (e) {
        if (!alive) return;
        setMyStats(null);
        setRecentMatches([]);
        setErr(
          e?.response?.data?.message || e.message || "Error cargando HomeMember"
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [clubId, season]);

  const played = Number(myStats?.played ?? 0);
  const goals = Number(myStats?.goals ?? 0);
  const assists = Number(myStats?.assists ?? 0);
  const contrib = Number(
    myStats?.goalContrib ?? myStats?.contrib ?? goals + assists
  );

  const goalPerMatch = Number(myStats?.goalPerMatch ?? 0);
  const assistPerMatch = Number(myStats?.assistPerMatch ?? 0);
  const contribPerMatch = Number(myStats?.contribPerMatch ?? 0);

  const directGoalInvolvement = useMemo(() => {
    return goals + assists;
  }, [goals, assists]);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">INICIO</div>

            <div className="mt-1 text-sm text-[var(--fifa-mute)]">
              Estado:{" "}
              <span className="text-[var(--fifa-cyan)] font-semibold">
                Miembro
              </span>
            </div>

            <div className="mt-3 text-sm text-[var(--fifa-mute)]">
              Jugador:{" "}
              <span className="text-[var(--fifa-text)] font-semibold">
                {displayName}
              </span>
              {" "}· Temporada:{" "}
              <span className="text-[var(--fifa-text)]">{season || "—"}</span>
            </div>
          </div>

          <div className="w-full lg:w-[220px]">
            <div className="text-xs text-[var(--fifa-mute)] mb-2">Temporada</div>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
            >
              {seasons.length === 0 ? (
                <option value={season}>{season || "Sin temporadas"}</option>
              ) : (
                seasons.map((s) => (
                  <option key={s} value={String(s)}>
                    {s}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-[var(--fifa-mute)]">
            Cargando tus stats…
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {err}
          </div>
        ) : null}
      </div>

      {/* KPI PRINCIPALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Partidos" value={String(played)} />
        <StatCard label="Goles" value={String(goals)} />
        <StatCard label="Asistencias" value={String(assists)} />
        <StatCard label="Contribución" value={String(contrib)} />
      </div>

      {/* KPI SECUNDARIOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpiCard
          label="G/PJ"
          value={goalPerMatch}
          accent="var(--fifa-neon)"
        />
        <MiniKpiCard
          label="A/PJ"
          value={assistPerMatch}
          accent="var(--fifa-cyan)"
        />
        <MiniKpiCard
          label="C/PJ"
          value={contribPerMatch}
          accent="var(--fifa-cyan)"
        />
        <MiniKpiCard
          label="Acciones gol"
          value={directGoalInvolvement}
          accent="var(--fifa-mute)"
        />
      </div>

      {/* PERFIL + RESUMEN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BoardCard
          title="TU PERFIL"
          subtitle="Resumen individual en la temporada seleccionada"
        >
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-[rgba(0,212,255,0.08)] to-[rgba(0,0,0,0.10)] ring-1 ring-[var(--fifa-line)] p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-black/25 ring-1 ring-[var(--fifa-line)] flex items-center justify-center text-xl">
                👤
              </div>

              <div>
                <div className="text-lg font-extrabold text-[var(--fifa-text)]">
                  {displayName}
                </div>
                <div className="text-sm text-[var(--fifa-mute)]">
                  @{user?.username || "usuario"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniKpi
                label="Partidos"
                value={played}
                accent="var(--fifa-mute)"
              />
              <MiniKpi
                label="Contrib."
                value={contrib}
                accent="var(--fifa-cyan)"
              />
              <MiniKpi
                label="Goles"
                value={goals}
                accent="var(--fifa-neon)"
              />
              <MiniKpi
                label="Asist."
                value={assists}
                accent="var(--fifa-cyan)"
              />
            </div>
          </div>
        </BoardCard>

        <BoardCard
          title="RENDIMIENTO"
          subtitle="Ratios y lectura rápida de tu temporada"
        >
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniKpi
              label="G/PJ"
              value={goalPerMatch}
              accent="var(--fifa-neon)"
            />
            <MiniKpi
              label="A/PJ"
              value={assistPerMatch}
              accent="var(--fifa-cyan)"
            />
            <MiniKpi
              label="C/PJ"
              value={contribPerMatch}
              accent="var(--fifa-cyan)"
            />
            <MiniKpi
              label="PJ"
              value={played}
              accent="var(--fifa-mute)"
            />
          </div>

          <div className="mt-4 rounded-xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-3">
            <div className="text-xs text-[var(--fifa-mute)]">
              Fuente de datos
            </div>
            <div className="mt-1 text-sm text-[var(--fifa-text)]">
              /clubs/:clubId/players/me/stats
            </div>
            <div className="mt-1 text-xs text-[var(--fifa-mute)]">
              Filtrado por temporada seleccionada
            </div>
          </div>
        </BoardCard>
      </div>

      {/* ÚLTIMOS PARTIDOS DEL CLUB */}
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
            ÚLTIMOS PARTIDOS DEL CLUB
          </div>

          <button
            type="button"
            onClick={() => navigate("/league")}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon transition"
          >
            Ver liga
          </button>
        </div>

        {recentMatches.length === 0 ? (
          <div className="mt-3 text-sm text-[var(--fifa-mute)]">
            No hay partidos registrados para esta temporada.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentMatches.map((match) => {
              const homeName = match?.homeClub?.name || "Home";
              const awayName = match?.awayClub?.name || "Away";
              const isHome =
                String(match?.homeClub?._id || match?.homeClub) ===
                String(clubId);

              const myGoals = isHome
                ? Number(match?.scoreHome ?? 0)
                : Number(match?.scoreAway ?? 0);

              const rivalGoals = isHome
                ? Number(match?.scoreAway ?? 0)
                : Number(match?.scoreHome ?? 0);

              let resultLabel = "EMPATE";
              let resultAccent = "var(--fifa-cyan)";

              if (myGoals > rivalGoals) {
                resultLabel = "VICTORIA";
                resultAccent = "var(--fifa-neon)";
              } else if (myGoals < rivalGoals) {
                resultLabel = "DERROTA";
                resultAccent = "var(--fifa-danger)";
              }

              return (
                <div
                  key={match._id}
                  className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-[var(--fifa-mute)]">
                      {match?.date
                        ? new Date(match.date).toLocaleDateString()
                        : "—"}
                    </div>
                    <div
                      className="text-[10px] font-extrabold tracking-widest"
                      style={{ color: resultAccent }}
                    >
                      {resultLabel}
                    </div>
                  </div>

                  <div className="mt-3 text-sm font-semibold text-[var(--fifa-text)]">
                    {homeName} <span className="text-[var(--fifa-mute)]">vs</span>{" "}
                    {awayName}
                  </div>

                  <div className="mt-2 text-2xl font-extrabold text-[var(--fifa-text)]">
                    {match?.scoreHome ?? 0} - {match?.scoreAway ?? 0}
                  </div>

                  <div className="mt-2 text-xs text-[var(--fifa-mute)]">
                    {match?.stadium || "Sin estadio"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOQUE FINAL */}
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          RESUMEN
        </div>
        <div className="mt-3 text-sm text-[var(--fifa-mute)]">
          Aquí ves tu rendimiento individual y los partidos recientes del club,
          separados por temporada.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-text)]">
        {value}
      </div>
    </div>
  );
}

function MiniKpiCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function BoardCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
      <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-2 text-xs text-[var(--fifa-mute)]">{subtitle}</div>
      ) : null}
      {children}
    </div>
  );
}

function MiniKpi({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/25 p-3 ring-1 ring-[var(--fifa-line)]">
      <div className="text-[10px] tracking-widest text-[var(--fifa-mute)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}