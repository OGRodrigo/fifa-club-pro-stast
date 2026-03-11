// src/pages/home/HomeNoClub.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function HomeNoClub() {
  const nav = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-2xl font-extrabold tracking-tight">INICIO</div>
        <div className="mt-1 text-sm text-[var(--fifa-mute)]">
          Estado:{" "}
          <span className="font-semibold text-[var(--fifa-danger)]">
            Sin club
          </span>
        </div>
        <div className="mt-3 text-sm text-[var(--fifa-mute)]">
          Bienvenido,{" "}
          <span className="font-semibold text-[var(--fifa-text)]">
            {user?.username ?? "usuario"}
          </span>
          . Crea un club o únete a uno para empezar a registrar partidos y
          estadísticas.
        </div>
      </div>

      {/* ACCIONES PRINCIPALES */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          PRIMEROS PASOS
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ActionCard
            title="Crear club"
            text="Levanta tu propio club y empieza a gestionar miembros, partidos y estadísticas."
            buttonText="Crear club"
            onClick={() => nav("/clubs/create")}
            icon="➕"
          />

          <ActionCard
            title="Unirse a club"
            text="Busca un club existente y envía una solicitud para entrar al plantel."
            buttonText="Ver clubes"
            onClick={() => nav("/clubs")}
            icon="🤝"
          />
        </div>
      </div>

      {/* RESUMEN PERSONAL */}
      <div className="rounded-2xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          TU PANEL PERSONAL
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Partidos" value="0" />
          <StatCard label="Goles" value="0" />
          <StatCard label="Asistencias" value="0" />
          <StatCard label="Rating" value="0" />
        </div>

        <div className="mt-4 rounded-xl bg-black/20 p-4 ring-1 ring-[var(--fifa-line)]">
          <div className="text-sm text-[var(--fifa-mute)]">
            Tus estadísticas aparecerán aquí cuando formes parte de un club y se
            empiecen a registrar partidos.
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, text, buttonText, onClick, icon }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30 text-lg ring-1 ring-[var(--fifa-line)]">
          {icon}
        </div>

        <div className="flex-1">
          <div className="text-sm font-extrabold text-[var(--fifa-text)]">
            {title}
          </div>
          <div className="mt-2 text-sm text-[var(--fifa-mute)]">
            {text}
          </div>

          <button
            type="button"
            onClick={onClick}
            className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
          >
            {buttonText}
          </button>
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