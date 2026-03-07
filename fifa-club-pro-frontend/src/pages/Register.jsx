// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as apiRegister } from "../api/auth";

export default function Register() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [username, setUsername] = useState("");
  const [gamerTag, setGamerTag] = useState("");
  const [platform, setPlatform] = useState("PS");
  const [country, setCountry] = useState("Chile");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      if (!username || !email || !password || !gamerTag) {
        setErr("Completa username, email, password y gamerTag.");
        return;
      }

      await apiRegister({
        username,
        gamerTag,
        platform,
        country,
        email,
        password,
      });

      nav("/login", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Error en registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fifa-radial flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--fifa-text)]">
            Registrar usuario
          </h1>
          <p className="mt-1 text-sm text-[var(--fifa-mute)]">
            Crea tu cuenta para unirte a un club.
          </p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {err ? (
            <div className="rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
              {err}
            </div>
          ) : null}

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">Username</label>
            <input
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-cyan)]/40"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="locojuan"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">Email</label>
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
            <label className="block text-sm text-[var(--fifa-mute)]">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-neon)]/35"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">GamerTag</label>
            <input
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-cyan)]/40"
              value={gamerTag}
              onChange={(e) => setGamerTag(e.target.value)}
              placeholder="JuanPro"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--fifa-mute)]">Plataforma</label>
              <select
                className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-neon)]/35"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="PS">PS</option>
                <option value="XBOX">XBOX</option>
                <option value="PC">PC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--fifa-mute)]">País</label>
              <input
                className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-cyan)]/40"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Chile"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-white/5 px-3 py-2 font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-[0_0_22px_rgba(36,255,122,0.22)] transition disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>

          <div className="text-sm text-[var(--fifa-mute)]">
            ¿Ya tienes cuenta?{" "}
            <Link
              to="/login"
              className="text-[var(--fifa-cyan)] font-semibold hover:underline"
            >
              Iniciar sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
