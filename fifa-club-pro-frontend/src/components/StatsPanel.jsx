export default function StatsPanel({
  title = "STATS",
  subtitle = "Último partido",
  leftTitle = "Jugador",
  leftValue = "Lamine Yamal",
  rating = 91,
  stats = [
    { label: "Aceleración", value: 87 },
    { label: "Velocidad", value: 86 },
    { label: "Tiro", value: 79 },
    { label: "Pase", value: 84 },
    { label: "Regate", value: 90 },
    { label: "Defensa", value: 45 },
    { label: "Físico", value: 60 },
  ],
}) {
  return (
    <div className="rounded-2xl bg-fifa-card ring-1 ring-fifa-line shadow-glow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-fifa-line/70">
        <div>
          <div className="text-xs font-semibold tracking-widest text-fifa-neon">
            {title}
          </div>
          <div className="text-sm text-fifa-mute">{subtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-fifa-mute">OVR</div>
          <div className="rounded-lg bg-black/35 px-3 py-1.5 text-lg font-extrabold text-fifa-text ring-1 ring-fifa-neon/25">
            {rating}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-4 p-5">
        {/* Left block (jugador) */}
        <div className="col-span-12 md:col-span-5">
          <div className="rounded-xl bg-black/30 ring-1 ring-fifa-line p-4">
            <div className="text-xs text-fifa-mute">{leftTitle}</div>
            <div className="mt-1 text-xl font-extrabold tracking-tight">
              {leftValue}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-fifa-neon"
                  style={{ width: `${Math.min(100, rating)}%` }}
                />
              </div>
              <div className="text-xs text-fifa-mute w-10 text-right">
                {rating}%
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Badge label="Forma" value="Alta" />
              <Badge label="Posición" value="RW" />
              <Badge label="Pie" value="Izq." />
              <Badge label="Skill" value="★★★★" />
            </div>
          </div>
        </div>

        {/* Right stats list */}
        <div className="col-span-12 md:col-span-7">
          <div className="rounded-xl bg-black/30 ring-1 ring-fifa-line p-4">
            <div className="text-xs font-semibold tracking-widest text-fifa-mute">
              ATRIBUTOS
            </div>

            <div className="mt-3 space-y-3">
              {stats.map((s) => (
                <StatRow key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  const v = Math.max(0, Math.min(99, Number(value) || 0));
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-5 text-sm text-fifa-mute">{label}</div>
      <div className="col-span-2 text-sm font-bold text-fifa-text text-right">
        {v}
      </div>
      <div className="col-span-5">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-fifa-cyan"
            style={{ width: `${(v / 99) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 ring-1 ring-fifa-line px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-fifa-mute">
        {label}
      </div>
      <div className="text-sm font-semibold text-fifa-text">{value}</div>
    </div>
  );
}
