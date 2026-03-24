import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

function cardClass() {
  return "rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow";
}

function getClubName(clubLike) {
  if (!clubLike) return "Club";
  if (typeof clubLike === "string") return clubLike;
  return clubLike.name || "Club";
}

function getClubId(clubLike) {
  if (!clubLike) return "";
  if (typeof clubLike === "string") return clubLike;
  return clubLike._id || "";
}

function formatMatchDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Fecha inválida";
  return d.toLocaleDateString();
}

function formatMatchDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Fecha inválida";
  return d.toLocaleString();
}

function getMatchResultMeta(match, myClubId) {
  const homeId = getClubId(match?.homeClub);
  const awayId = getClubId(match?.awayClub);

  const isHome = String(homeId) === String(myClubId);
  const isAway = String(awayId) === String(myClubId);

  if (!isHome && !isAway) {
    return {
      label: "PARTIDO",
      accent: "var(--fifa-cyan)",
      ring: "ring-[var(--fifa-line)]",
    };
  }

  const myGoals = isHome
    ? Number(match?.scoreHome ?? 0)
    : Number(match?.scoreAway ?? 0);

  const rivalGoals = isHome
    ? Number(match?.scoreAway ?? 0)
    : Number(match?.scoreHome ?? 0);

  if (myGoals > rivalGoals) {
    return {
      label: "VICTORIA",
      accent: "var(--fifa-neon)",
      ring: "ring-[var(--fifa-neon)]/30",
    };
  }

  if (myGoals < rivalGoals) {
    return {
      label: "DERROTA",
      accent: "var(--fifa-danger)",
      ring: "ring-[var(--fifa-danger)]/30",
    };
  }

  return {
    label: "EMPATE",
    accent: "var(--fifa-cyan)",
    ring: "ring-[var(--fifa-cyan)]/30",
  };
}

export default function Matches() {
  const { clubContext } = useAuth();
  const navigate = useNavigate();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";
  const isAdminOrCaptain = role === "admin" || role === "captain";

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loadMatches() {
    if (!clubId) {
      setMatches([]);
      return;
    }

    try {
      setLoading(true);
      setErr("");

      const { data } = await api.get("/matches", {
        params: {
          club: clubId,
          page: 1,
          limit: 50,
        },
      });

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.matches)
        ? data.matches
        : Array.isArray(data)
        ? data
        : [];

      setMatches(list);
    } catch (error) {
      console.error(error);
      setErr(
        error?.response?.data?.message ||
          error?.message ||
          "Error cargando partidos"
      );
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [clubId]);

  const orderedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const da = new Date(a?.date || 0).getTime();
      const db = new Date(b?.date || 0).getTime();
      return db - da;
    });
  }, [matches]);

  if (!clubId) {
    return (
      <section className="space-y-6">
        <div className={cardClass()}>
          <div className="text-2xl font-extrabold tracking-tight text-[var(--fifa-text)]">
            PARTIDOS
          </div>
          <div className="mt-3 text-sm text-[var(--fifa-mute)]">
            No tienes un club activo seleccionado.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className={cardClass()}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.25em] text-[var(--fifa-mute)]">
              FIFA CLUB PRO
            </div>

            <div className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
              PARTIDOS
            </div>

            <div className="mt-3 text-sm text-[var(--fifa-mute)]">
              Revisa los partidos del club, entra al detalle y registra nuevos
              encuentros desde flujo manual o por imágenes.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdminOrCaptain ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/matches/create/manual")}
                  className="rounded-xl bg-[var(--fifa-neon)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Crear manual
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/matches/create/images")}
                  className="rounded-xl bg-[var(--fifa-cyan)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Crear con IA
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={loadMatches}
              className="rounded-xl border border-[var(--fifa-line)] px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] transition hover:bg-white/5"
            >
              Recargar
            </button>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
          <div className="text-xs text-[var(--fifa-mute)]">Total partidos</div>
          <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-text)]">
            {orderedMatches.length}
          </div>
        </div>

        <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
          <div className="text-xs text-[var(--fifa-mute)]">Rol actual</div>
          <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-cyan)]">
            {role || "—"}
          </div>
        </div>

        <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
          <div className="text-xs text-[var(--fifa-mute)]">Flujo manual</div>
          <div className="mt-1 text-lg font-extrabold text-[var(--fifa-neon)]">
            Activo
          </div>
        </div>

        <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
          <div className="text-xs text-[var(--fifa-mute)]">Flujo IA</div>
          <div className="mt-1 text-lg font-extrabold text-[var(--fifa-cyan)]">
            Activo
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className={cardClass()}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
              HISTORIAL DEL CLUB
            </div>
            <div className="mt-1 text-sm text-[var(--fifa-mute)]">
              Últimos partidos registrados para el club activo.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-[var(--fifa-mute)]">
            Cargando partidos...
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-xl bg-black/30 p-4 text-sm text-[var(--fifa-danger)] ring-1 ring-[var(--fifa-danger)]/40">
            {err}
          </div>
        ) : null}

        {!loading && !err && orderedMatches.length === 0 ? (
          <div className="mt-6 rounded-xl bg-black/25 p-5 text-sm text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)]">
            No hay partidos registrados todavía.
          </div>
        ) : null}

        {!loading && !err && orderedMatches.length > 0 ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {orderedMatches.map((match) => {
              const homeName = getClubName(match?.homeClub);
              const awayName = getClubName(match?.awayClub);

              const resultMeta = getMatchResultMeta(match, clubId);

              return (
                <div
                  key={match._id}
                  className={`rounded-2xl bg-black/25 p-5 ring-1 ${resultMeta.ring} transition hover:shadow-neon`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[var(--fifa-mute)]">
                        {formatMatchDateTime(match?.date)}
                      </div>

                      <div className="mt-2 text-xs font-extrabold tracking-[0.2em]" style={{ color: resultMeta.accent }}>
                        {resultMeta.label}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/matches/${match._id}`)}
                      className="rounded-lg border border-[var(--fifa-line)] px-3 py-2 text-xs font-semibold text-[var(--fifa-text)] transition hover:ring-1 hover:ring-[var(--fifa-neon)]/30"
                    >
                      Ver detalle
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="min-w-0">
                      <div className="text-xs text-[var(--fifa-mute)]">HOME</div>
                      <div className="mt-1 truncate text-lg font-extrabold text-[var(--fifa-text)]">
                        {homeName}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 px-6 py-4 text-center ring-1 ring-[var(--fifa-line)]">
                      <div className="text-3xl font-extrabold text-[var(--fifa-text)]">
                        {match?.scoreHome ?? 0} - {match?.scoreAway ?? 0}
                      </div>
                      <div className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-[var(--fifa-mute)]">
                        RESULTADO
                      </div>
                    </div>

                    <div className="min-w-0 text-left md:text-right">
                      <div className="text-xs text-[var(--fifa-mute)]">AWAY</div>
                      <div className="mt-1 truncate text-lg font-extrabold text-[var(--fifa-text)]">
                        {awayName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)]">
                      {match?.competition || "League"}
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)]">
                      {match?.stadium || "Sin estadio"}
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)]">
                      {match?.status || "played"}
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)]">
                      {formatMatchDate(match?.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}