// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { setSessionFromLogin, bootstrapClubContext } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      // 1) login
      const data = await apiLogin(email, password);

      const token = data?.token || null;
      const user = data?.user || null;

      if (!token) throw new Error("No llegó token desde /auth/login.");

      // 2) guardar sesión (clubContext puede venir o no)
      setSessionFromLogin({
        token,
        user,
        clubContext: data?.clubContext || null,
      });

      // 3) si no vino clubContext, lo pedimos
      if (!data?.clubContext?.clubId) {
        await bootstrapClubContext(); // GET /auth/me
      }

      // 4) ir a Home (Home decide UI por rol/club)
      nav("/home", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Error en login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fifa-radial flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--fifa-text)]">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-[var(--fifa-mute)]">
            Entra a tu club y revisa tus estadísticas.
          </p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {err ? (
            <div className="rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
              {err}
            </div>
          ) : null}

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">Correo</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-cyan)]/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-neon)]/35"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-white/5 px-3 py-2 font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-[0_0_22px_rgba(36,255,122,0.22)] transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="text-sm text-[var(--fifa-mute)]">
            ¿No tienes cuenta?{" "}
            <Link
              to="/register"
              className="text-[var(--fifa-cyan)] font-semibold hover:underline"
            >
              Registrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
