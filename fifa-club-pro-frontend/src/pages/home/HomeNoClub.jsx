// src/pages/home/HomeNoClub.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function HomeNoClub() {
  const nav = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <div className="text-2xl font-extrabold tracking-tight">INICIO</div>
        <div className="mt-1 text-sm text-[var(--fifa-mute)]">
          Estado: <span className="text-[var(--fifa-danger)] font-semibold">Sin club</span>
        </div>
        <div className="mt-3 text-sm text-[var(--fifa-mute)]">
          Bienvenido, <span className="text-[var(--fifa-text)] font-semibold">{user?.username ?? "usuario"}</span>.  
          Crea un club o únete a uno para empezar a registrar partidos.
        </div>
      </div>

      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
          SIN CLUB
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => nav("/clubs/create")}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon transition"
          >
            Crear club
          </button>

          <button
            onClick={() => nav("/clubs/join")}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon transition"
          >
            Unirse a club
          </button>
        </div>

        {/* Stats personales (0 por defecto) */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Partidos" value="0" />
          <StatCard label="Goles" value="0" />
          <StatCard label="Asistencias" value="0" />
          <StatCard label="Rating" value="0" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-text)]">{value}</div>
    </div>
  );
}
