// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as apiRegister, me as apiMe } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { setSessionFromLogin, setClubContext } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gamerTag, setGamerTag] = useState("");
  const [platform, setPlatform] = useState("PS");
  const [country, setCountry] = useState("");

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

  function validateForm() {
    if (!username.trim()) return "Debes ingresar username.";
    if (!email.trim()) return "Debes ingresar email.";
    if (!password.trim()) return "Debes ingresar password.";
    if (password.trim().length < 6) {
      return "La password debe tener al menos 6 caracteres.";
    }
    if (!gamerTag.trim()) return "Debes ingresar gamerTag.";
    if (!platform.trim()) return "Debes seleccionar plataforma.";
    if (!country.trim()) return "Debes ingresar país.";
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (loading) return;

    const validationError = validateForm();
    if (validationError) {
      setErr(validationError);
      return;
    }

    try {
      setLoading(true);
      setErr("");

      const payload = {
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
        gamerTag: gamerTag.trim(),
        platform: platform.trim(),
        country: country.trim(),
      };

      const data = await apiRegister(payload);

      const token = data?.token || null;
      const user = data?.user || null;
      let clubContext = data?.clubContext || null;

      if (token && user) {
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
        return;
      }

      navigate("/login", { replace: true });
    } catch (error) {
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 409) {
        setErr(backendMessage || "Ya existe un usuario con esos datos.");
        return;
      }

      setErr(backendMessage || error.message || "No se pudo registrar la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl lg:grid-cols-2">
          <section className="hidden lg:flex flex-col justify-between bg-black/20 p-10">
            <div>
              <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
                FIFA Club Pro
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight">
                Crea tu cuenta
                <br />
                y entra al ecosistema
                <br />
                de tu club.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
                Registro inicial de usuario para acceder a clubes, gestionar
                partidos, revisar estadísticas y operar dentro del sistema.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              <FeatureItem
                title="Perfil base del jugador"
                text="Username, gamerTag, plataforma y país quedan listos desde el alta."
              />
              <FeatureItem
                title="Sesión consistente"
                text="Si el backend devuelve token al registrar, la app entra directo con sesión persistente."
              />
              <FeatureItem
                title="Escalable para clubes"
                text="Luego podrás crear club, unirte a uno existente o operar según tu rol."
              />
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <div className="text-sm font-medium uppercase tracking-wider text-sky-300">
                  Nuevo usuario
                </div>
                <h2 className="mt-2 text-3xl font-bold">Crear cuenta</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Completa tus datos para registrarte en FIFA Club Pro.
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
                    Username
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (err) setErr("");
                    }}
                    placeholder="rodrigo"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-sky-500/50"
                    disabled={loading}
                  />
                </label>

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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-sky-500/50"
                    disabled={loading}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (err) setErr("");
                    }}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-sky-500/50"
                    disabled={loading}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    GamerTag
                  </span>
                  <input
                    type="text"
                    value={gamerTag}
                    onChange={(e) => {
                      setGamerTag(e.target.value);
                      if (err) setErr("");
                    }}
                    placeholder="Tu ID dentro del juego"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-sky-500/50"
                    disabled={loading}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Plataforma
                  </span>
                  <select
                    value={platform}
                    onChange={(e) => {
                      setPlatform(e.target.value);
                      if (err) setErr("");
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-sky-500/50"
                    disabled={loading}
                  >
                    <option value="PS">PlayStation</option>
                    <option value="XBOX">Xbox</option>
                    <option value="PC">PC</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    País
                  </span>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      if (err) setErr("");
                    }}
                    placeholder="Chile"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-sky-500/50"
                    disabled={loading}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creando cuenta..." : "Registrarme"}
                </button>
              </form>

              <div className="mt-6 text-sm text-slate-400">
                ¿Ya tienes cuenta?{" "}
                <Link
                  to="/login"
                  className="font-medium text-sky-300 hover:text-sky-200"
                >
                  Iniciar sesión
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                Nota: este flujo soporta ambos escenarios: backend con
                autologin inmediato o backend que solo registra y luego manda a
                login.
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