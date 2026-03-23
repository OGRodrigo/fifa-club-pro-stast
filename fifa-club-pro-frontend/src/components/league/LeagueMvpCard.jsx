// src/components/league/LeagueMvpCard.jsx
import LeagueMiniStat from "./LeagueMiniStat";

export default function LeagueMvpCard({ mvp, season }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-[var(--fifa-card)] shadow-glow ring-1 ring-[var(--fifa-line)]">
      <div className="border-b border-[var(--fifa-line)]/70 bg-black/20 px-5 py-4">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
          MVP DE LA TEMPORADA
        </div>
        <div className="text-sm text-[var(--fifa-mute)]">
          Mejor jugador según puntos acumulados
        </div>
      </div>

      <div className="p-5 md:p-6">
        {!mvp ? (
          <div className="text-[var(--fifa-mute)]">
            Aún no hay MVP para esta temporada.
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-gradient-to-br from-[rgba(0,255,194,0.10)] to-[rgba(0,0,0,0.15)] p-5 ring-1 ring-[var(--fifa-neon)]/25">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(0,255,194,0.10)] text-2xl ring-1 ring-[var(--fifa-neon)]/30">
                  🏆
                </div>

                <div>
                  <div className="text-xs tracking-widest text-[var(--fifa-mute)]">
                    JUGADOR DESTACADO
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-[var(--fifa-text)]">
                    {mvp.gamerTag || mvp.username || "—"}
                  </div>
                  <div className="mt-1 text-sm text-[var(--fifa-mute)]">
                    @{mvp.username || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-[var(--fifa-mute)]">
                Temporada{" "}
                <span className="font-semibold text-[var(--fifa-text)]">
                  {season || "—"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <LeagueMiniStat
                label="Puntos"
                value={mvp.points ?? 0}
                accent="var(--fifa-cyan)"
              />
              <LeagueMiniStat
                label="PJ"
                value={mvp.played ?? 0}
                accent="var(--fifa-mute)"
              />
              <LeagueMiniStat
                label="Goles"
                value={mvp.goals ?? 0}
                accent="var(--fifa-neon)"
              />
              <LeagueMiniStat
                label="Asist."
                value={mvp.assists ?? 0}
                accent="var(--fifa-cyan)"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}