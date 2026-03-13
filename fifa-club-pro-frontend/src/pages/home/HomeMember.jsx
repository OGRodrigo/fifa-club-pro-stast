// src/pages/home/HomeMember.jsx
import { useEffect, useState } from "react";
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
      } catch {
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
      if (!clubId || !season) {
        if (!alive) return;
        setMyStats(null);
        setRecentMatches([]);
        setErr("");
        return;
      }

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
          Array.isArray(matchesRes.data?.data)
            ? matchesRes.data.data
            : Array.isArray(matchesRes.data?.matches)
            ? matchesRes.data.matches
            : []
        );
      } catch (e) {
        if (!alive) return;
        setMyStats(null);
        setRecentMatches([]);
        setErr(
          e?.response?.data?.message ||
            e.message ||
            "Error cargando HomeMember"
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

  const directGoalInvolvement = goals + assists;

  if (!clubId) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
          <div className="text-2xl font-extrabold tracking-tight">INICIO</div>
          <div className="mt-3 text-sm text-[var(--fifa-mute)]">
            No tienes un club activo seleccionado.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">INICIO</div>

            <div className="mt-1 text-sm text-[var(--fifa-mute)]">
              Estado:{" "}
              <span className="font-semibold text-[var(--fifa-cyan)]">
                Miembro
              </span>
            </div>

            <div className="mt-3 text-sm text-[var(--fifa-mute)]">
              Jugador:{" "}
              <span className="font-semibold text-[var(--fifa-text)]">
                {displayName}
              </span>
              {" "}· Temporada:{" "}
              <span className="text-[var(--fifa-text)]">{season || "—"}</span>
            </div>
          </div>

          <div className="w-full lg:w-[220px]">
            <div className="mb-2 text-xs text-[var(--fifa-mute)]">Temporada</div>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full rounded-xl bg-black/30 p-3 text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)]"
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
          <div className="mt-4 rounded-lg bg-black/30 p-3 text-sm text-[var(--fifa-danger)] ring-1 ring-[var(--fifa-danger)]/40">
            {err}
          </div>
        ) : null}
      </div>

      {/* ACCESOS */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          ACCESOS RÁPIDOS
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickActionCard
            title="Partidos"
            subtitle="Ver los partidos recientes del club"
            icon="⚽"
            accent="var(--fifa-neon)"
            onClick={() => navigate("/matches")}
          />

          <QuickActionCard
            title="Liga"
            subtitle="Ver tabla y panorama competitivo"
            icon="🏆"
            accent="var(--fifa-cyan)"
            onClick={() => navigate("/league")}
          />

          <QuickActionCard
            title="Inicio"
            subtitle="Mantenerte en tu panel personal"
            icon="👤"
            accent="var(--fifa-cyan)"
            onClick={() => navigate("/home")}
          />
        </div>
      </div>

      {/* KPI PRINCIPALES */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Partidos" value={String(played)} />
        <StatCard label="Goles" value={String(goals)} />
        <StatCard label="Asistencias" value={String(assists)} />
        <StatCard label="Contribución" value={String(contrib)} />
      </div>

      {/* KPI SECUNDARIOS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BoardCard
          title="TU PERFIL"
          subtitle="Resumen individual en la temporada seleccionada"
        >
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-[rgba(0,212,255,0.08)] to-[rgba(0,0,0,0.10)] p-4 ring-1 ring-[var(--fifa-line)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/25 text-xl ring-1 ring-[var(--fifa-line)]">
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
        </BoardCard>
      </div>

      {/* ÚLTIMOS PARTIDOS DEL CLUB */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
            ÚLTIMOS PARTIDOS DEL CLUB
          </div>

          <button
            type="button"
            onClick={() => navigate("/league")}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
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
                String(match?.homeClub?._id || match?.homeClub) === String(clubId);

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
                <button
                  key={match._id}
                  type="button"
                  onClick={() => navigate(`/matches/${match._id}`)}
                  className="rounded-xl bg-black/25 p-4 text-left ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-[var(--fifa-mute)]">
                      {match?.date ? new Date(match.date).toLocaleDateString() : "—"}
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

                  <div className="mt-3 text-[11px] font-semibold text-[var(--fifa-cyan)]">
                    Ver detalle →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOQUE FINAL */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
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
    <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
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

function QuickActionCard({ title, subtitle, icon, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-black/25 p-4 text-left ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-[var(--fifa-text)]">
            {title}
          </div>
          <div className="mt-1 text-xs text-[var(--fifa-mute)]">{subtitle}</div>
        </div>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-lg ring-1 ring-[var(--fifa-line)]"
          style={{ color: accent }}
        >
          {icon}
        </div>
      </div>
    </button>
  );
}