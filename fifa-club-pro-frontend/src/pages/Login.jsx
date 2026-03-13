// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as apiLogin, me as apiMe } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

/**
 * =====================================================
 * LOGIN PAGE
 * -----------------------------------------------------
 * Responsabilidades:
 * - capturar email/password
 * - llamar POST /auth/login
 * - guardar sesión con setSessionFromLogin(...)
 * - si el login no trae clubContext, intentar resolverlo con /auth/me
 * - redirigir a /home
 *
 * Este archivo queda alineado con:
 * - src/api/auth.js
 * - src/auth/AuthContext.jsx
 * =====================================================
 */
export default function Login() {
  const navigate = useNavigate();
  const { setSessionFromLogin, setClubContext } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function resolveClubContextFallback() {
    try {
      const meData = await apiMe();

      if (meData?.clubContext?.clubId) {
        return meData.clubContext;
      }

      if (Array.isArray(meData?.memberships) && meData.memberships.length > 0) {
        const firstMembership = meData.memberships[0];

        if (firstMembership?.clubId && firstMembership?.role) {
          return {
            clubId: firstMembership.clubId,
            role: firstMembership.role,
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setErr("Debes completar email y password.");
      return;
    }

    try {
      setLoading(true);
      setErr("");

      const data = await apiLogin(email.trim(), password);

      const token = data?.token || null;
      const user = data?.user || null;
      let clubContext = data?.clubContext || null;

      if (!token || !user) {
        throw new Error("La respuesta de login no devolvió token o user.");
      }

      setSessionFromLogin({
        token,
        user,
        clubContext,
      });

      if (!clubContext?.clubId) {
        clubContext = await resolveClubContextFallback();

        if (clubContext?.clubId) {
          setClubContext(clubContext);
        }
      }

      navigate("/home", { replace: true });
    } catch (error) {
      setErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl lg:grid-cols-2">
          <section className="hidden flex-col justify-between bg-black/20 p-10 lg:flex">
            <div>
              <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                FIFA Club Pro
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight">
                Gestiona tu club,
                <br />
                tus partidos
                <br />
                y tus estadísticas.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
                Plataforma para clubes tipo Pro Clubs: miembros, roles,
                solicitudes, partidos, player stats y paneles de rendimiento.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              <FeatureItem
                title="Sesión persistente"
                text="Tu contexto de usuario y club se conserva para mantener la navegación consistente."
              />
              <FeatureItem
                title="Roles por club"
                text="Admin, captain y member con permisos diferenciados en la operación diaria."
              />
              <FeatureItem
                title="Gestión deportiva"
                text="Partidos, estadísticas individuales y control del plantel desde una sola app."
              />
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <div className="text-sm font-medium uppercase tracking-wider text-emerald-300">
                  Bienvenido de vuelta
                </div>
                <h2 className="mt-2 text-3xl font-bold">Iniciar sesión</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Entra con tu cuenta para acceder al panel del club.
                </p>
              </div>

              {err ? (
                <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (err) setErr("");
                    }}
                    placeholder="tu@email.com"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none ring-0 transition focus:border-emerald-500/50"
                    disabled={loading}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Password
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (err) setErr("");
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none ring-0 transition focus:border-emerald-500/50"
                    disabled={loading}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Ingresando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-6 text-sm text-slate-400">
                ¿Aún no tienes cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-emerald-300 hover:text-emerald-200"
                >
                  Crear cuenta
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                Nota: si el login no devuelve contexto de club, esta pantalla
                intenta reconstruirlo automáticamente desde <code>/auth/me</code>
                para evitar que el usuario entre sin <code>clubContext</code>.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-400">{text}</div>
    </div>
  );
}