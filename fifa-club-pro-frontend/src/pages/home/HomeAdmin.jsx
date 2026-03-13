// src/pages/home/HomeAdmin.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../ui/ToastContext";

export default function HomeAdmin() {
  const { clubContext, clearClubContext } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [summary, setSummary] = useState(null);
  const [leaderboards, setLeaderboards] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);

  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");

  const [deletingClub, setDeletingClub] = useState(false);

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

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!clubId || !season) {
        if (!alive) return;
        setSummary(null);
        setLeaderboards(null);
        setRecentMatches([]);
        setErr("");
        return;
      }

      setLoading(true);
      setErr("");

      try {
        const [summaryRes, leaderboardsRes, matchesRes] = await Promise.all([
          api.get(`/stats/club/${clubId}/summary`, {
            params: { season },
          }),
          api.get(`/clubs/${clubId}/players/leaderboards`, {
            params: { season, limit: 10 },
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

        setSummary(summaryRes.data || null);
        setLeaderboards(leaderboardsRes.data || null);
        setRecentMatches(
          Array.isArray(matchesRes.data?.data)
            ? matchesRes.data.data
            : Array.isArray(matchesRes.data?.matches)
            ? matchesRes.data.matches
            : []
        );
      } catch (e) {
        if (!alive) return;

        setErr(
          e?.response?.data?.message ||
            e.message ||
            "Error cargando HomeAdmin"
        );
        setSummary(null);
        setLeaderboards(null);
        setRecentMatches([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [clubId, season]);

  const overall = summary?.overall || null;
  const averages = summary?.averages || null;
  const streaks = summary?.streaks || null;

  const pj = overall?.played ?? 0;
  const pg = overall?.wins ?? 0;
  const pe = overall?.draws ?? 0;
  const pp = overall?.losses ?? 0;
  const gf = overall?.goalsFor ?? 0;
  const gc = overall?.goalsAgainst ?? 0;
  const pts = overall?.points ?? 0;

  const lb = leaderboards?.leaderboards || null;
  const topScorers = Array.isArray(lb?.topScorers) ? lb.topScorers : [];
  const topAssists = Array.isArray(lb?.topAssists) ? lb.topAssists : [];
  const mvpSeason = lb?.mvpSeason || null;
  const notes = lb?.notes || {};

  async function handleDeleteClub() {
    if (deletingClub) return;

    if (!isAdmin) {
      toast.error("Solo el admin puede eliminar el club.");
      return;
    }

    if (!clubId) {
      toast.error("No hay club activo.");
      return;
    }

    const confirmed = window.confirm(
      "Vas a eliminar el club y TODOS sus partidos, estadísticas, lineups y datos asociados. Esta acción no se puede deshacer. ¿Deseas continuar?"
    );

    if (!confirmed) return;

    try {
      setDeletingClub(true);

      await api.delete(`/clubs/${clubId}`);

      clearClubContext();
      toast.success("Club eliminado correctamente.");
      navigate("/clubs", { replace: true });
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e.message ||
        "No se pudo eliminar el club";

      toast.error(message);
    } finally {
      setDeletingClub(false);
    }
  }

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
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">INICIO</div>

            <div className="mt-1 text-sm text-[var(--fifa-mute)]">
              Estado:{" "}
              <span className="font-semibold text-[var(--fifa-neon)]">
                {role === "admin" ? "Administrador" : "Capitán"}
              </span>
            </div>

            <div className="mt-3 text-sm text-[var(--fifa-mute)]">
              Club: <span className="text-[var(--fifa-text)]">{clubId}</span>
              {" "}· Temporada:{" "}
              <span className="text-[var(--fifa-text)]">{season || "—"}</span>
            </div>
          </div>

          <div className="w-full space-y-3 lg:w-[260px]">
            <div>
              <div className="mb-2 text-xs text-[var(--fifa-mute)]">
                Temporada
              </div>
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

            {isAdmin ? (
              <button
                type="button"
                onClick={handleDeleteClub}
                disabled={deletingClub}
                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deletingClub ? "Eliminando club..." : "Eliminar club"}
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-[var(--fifa-mute)]">
            Cargando dashboard…
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-lg bg-black/30 p-3 text-sm text-[var(--fifa-danger)] ring-1 ring-[var(--fifa-danger)]/40">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          ACCESOS RÁPIDOS
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <QuickActionCard
            title="Partidos"
            subtitle="Registrar, editar y revisar matches"
            icon="⚽"
            accent="var(--fifa-neon)"
            onClick={() => navigate("/matches")}
          />

          <QuickActionCard
            title="Solicitudes"
            subtitle="Revisar ingresos al club"
            icon="📩"
            accent="var(--fifa-cyan)"
            onClick={() => navigate("/clubs/join-requests")}
          />

          <QuickActionCard
            title="Miembros"
            subtitle="Ver rendimiento del plantel"
            icon="📊"
            accent="var(--fifa-neon)"
            onClick={() => navigate("/club/members-stats")}
          />

          <QuickActionCard
            title="Club Analytics"
            subtitle="Vista ejecutiva del equipo"
            icon="📈"
            accent="var(--fifa-cyan)"
            onClick={() => navigate("/club/analytics")}
          />

          <QuickActionCard
            title="Liga"
            subtitle="Ver tabla y premios"
            icon="🏆"
            accent="var(--fifa-cyan)"
            onClick={() => navigate("/league")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="PJ" value={String(pj)} />
        <StatCard label="PG" value={String(pg)} />
        <StatCard label="GF" value={String(gf)} />
        <StatCard label="PTS" value={String(pts)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MiniKpiCard label="PE" value={pe} accent="var(--fifa-cyan)" />
        <MiniKpiCard label="PP" value={pp} accent="var(--fifa-danger)" />
        <MiniKpiCard label="GC" value={gc} accent="var(--fifa-mute)" />
        <MiniKpiCard
          label="PPM"
          value={averages?.pointsPerMatch ?? 0}
          accent="var(--fifa-cyan)"
        />
        <MiniKpiCard
          label="GF/PJ"
          value={averages?.goalsForPerMatch ?? 0}
          accent="var(--fifa-neon)"
        />
        <MiniKpiCard
          label="Invicta"
          value={streaks?.maxUnbeaten ?? 0}
          accent="var(--fifa-cyan)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BoardCard title="TOP GOLEADOR" subtitle={notes?.topScorers}>
          {topScorers.length === 0 ? (
            <EmptyRow text="Aún no hay goles registrados." />
          ) : (
            <FeaturePlayer
              title={topScorers[0]?.gamerTag || topScorers[0]?.username || "—"}
              subtitle={`@${topScorers[0]?.username || "—"}`}
              stats={[
                {
                  label: "Goles",
                  value: topScorers[0]?.goals ?? 0,
                  accent: "var(--fifa-neon)",
                },
                {
                  label: "PJ",
                  value: topScorers[0]?.played ?? 0,
                  accent: "var(--fifa-mute)",
                },
              ]}
              emoji="⚽"
            />
          )}
        </BoardCard>

        <BoardCard title="TOP ASISTENCIAS" subtitle={notes?.topAssists}>
          {topAssists.length === 0 ? (
            <EmptyRow text="Aún no hay asistencias registradas." />
          ) : (
            <FeaturePlayer
              title={topAssists[0]?.gamerTag || topAssists[0]?.username || "—"}
              subtitle={`@${topAssists[0]?.username || "—"}`}
              stats={[
                {
                  label: "Asist.",
                  value: topAssists[0]?.assists ?? 0,
                  accent: "var(--fifa-cyan)",
                },
                {
                  label: "PJ",
                  value: topAssists[0]?.played ?? 0,
                  accent: "var(--fifa-mute)",
                },
              ]}
              emoji="🎯"
            />
          )}
        </BoardCard>

        <BoardCard title="MVP DEL CLUB" subtitle={notes?.mvpSeason}>
          {mvpSeason ? (
            <FeaturePlayer
              title={mvpSeason?.gamerTag || mvpSeason?.username || "—"}
              subtitle={`@${mvpSeason?.username || "—"}`}
              stats={[
                {
                  label: "Puntos",
                  value: mvpSeason?.points ?? 0,
                  accent: "var(--fifa-cyan)",
                },
                {
                  label: "Goles",
                  value: mvpSeason?.goals ?? 0,
                  accent: "var(--fifa-neon)",
                },
                {
                  label: "Asist.",
                  value: mvpSeason?.assists ?? 0,
                  accent: "var(--fifa-cyan)",
                },
                {
                  label: "PJ",
                  value: mvpSeason?.played ?? 0,
                  accent: "var(--fifa-mute)",
                },
              ]}
              emoji="🏆"
              grid4
            />
          ) : (
            <EmptyRow text="Aún no hay MVP para esta temporada." />
          )}
        </BoardCard>
      </div>

      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          ÚLTIMOS PARTIDOS DEL CLUB
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
                    {homeName} <span className="text-[var(--fifa-mute)]">vs</span> {awayName}
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

      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          GESTIÓN DEL CLUB
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <ManageCard
            title="Solicitudes pendientes"
            text="Revisa quién quiere entrar al club y acepta o rechaza."
            buttonText="Abrir solicitudes"
            onClick={() => navigate("/clubs/join-requests")}
          />

          <ManageCard
            title="Panel de miembros"
            text="Consulta estadísticas individuales del plantel."
            buttonText="Ver miembros"
            onClick={() => navigate("/club/members-stats")}
          />

          <ManageCard
            title="Analítica del club"
            text="Abre la vista ejecutiva con forma, líderes y métricas globales."
            buttonText="Abrir analytics"
            onClick={() => navigate("/club/analytics")}
          />
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

function EmptyRow({ text }) {
  return <div className="mt-3 text-sm text-[var(--fifa-mute)]">{text}</div>;
}

function FeaturePlayer({ title, subtitle, stats, emoji = "⭐" }) {
  return (
    <div className="mt-3">
      <div className="rounded-2xl bg-gradient-to-br from-[rgba(0,255,194,0.08)] to-[rgba(0,0,0,0.10)] p-4 ring-1 ring-[var(--fifa-line)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/25 text-xl ring-1 ring-[var(--fifa-line)]">
            {emoji}
          </div>

          <div>
            <div className="text-lg font-extrabold text-[var(--fifa-text)]">
              {title}
            </div>
            <div className="text-sm text-[var(--fifa-mute)]">{subtitle}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((s, idx) => (
            <MiniKpi
              key={`${s.label}-${idx}`}
              label={s.label}
              value={s.value}
              accent={s.accent}
            />
          ))}
        </div>
      </div>
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

function ManageCard({ title, text, buttonText, onClick }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-sm font-extrabold text-[var(--fifa-text)]">{title}</div>
      <div className="mt-2 text-sm text-[var(--fifa-mute)]">{text}</div>

      <button
        type="button"
        onClick={onClick}
        className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
      >
        {buttonText}
      </button>
    </div>
  );
}