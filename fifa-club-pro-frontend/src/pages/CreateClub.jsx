// src/pages/CreateClub.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * CREATE CLUB (skin FIFA)
 * - POST /clubs (requiere JWT; tu interceptor lo agrega)
 * - Al crear: el creador queda como admin (backend)
 * - ✅ Guardamos clubContext => { clubId, role: "admin" }
 * - ✅ Redirigimos a /home para ver el clubId/rol arriba
 */
export default function CreateClub() {
  const nav = useNavigate();
  const { setClubContext } = useAuth(); // ✅ FIX: ahora sí existe

  // Estado del form
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Chile");
  const [isPrivate, setIsPrivate] = useState(true);

  // Estado UI
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        country: country.trim(),

        /**
         * ⚠️ Si tu backend NO tiene isPrivate en el schema o valida estricto,
         * coméntalo para evitar 400.
         */
        isPrivate,
      };

      const { data } = await api.post("/clubs", payload);

      // ✅ Guardar contexto del club (clave para que MainLayout muestre clubId/rol)
      setClubContext({ clubId: data._id, role: "admin" });

      // ✅ Ir a Home para ver ya el header con clubId/rol
      nav("/home");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
          Crear club
        </h1>
        <p className="mt-1 text-[var(--fifa-mute)]">
          Crea un club y luego podrás invitar miembros y asignar roles.
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-xl rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
            NUEVO CLUB
          </div>
          <div className="text-sm text-[var(--fifa-mute)]">
            Completa los datos básicos.
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {err ? (
            <div className="rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
              {err}
            </div>
          ) : null}

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">
              Nombre del club
            </label>
            <input
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-cyan)]/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Starteam"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--fifa-mute)]">País</label>
            <input
              className="mt-1 w-full rounded-lg bg-black/25 ring-1 ring-[var(--fifa-line)] px-3 py-2 text-[var(--fifa-text)] outline-none focus:ring-[var(--fifa-cyan)]/40"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Chile"
              autoComplete="country-name"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-4">
            <div>
              <div className="text-sm font-semibold text-[var(--fifa-text)]">
                Club privado
              </div>
              <div className="text-xs text-[var(--fifa-mute)]">
                Si es privado, solo miembros invitados podrán verlo.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivate((v) => !v)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
                isPrivate
                  ? "bg-white/5 text-[var(--fifa-text)] ring-[var(--fifa-neon)]/30 hover:shadow-[0_0_22px_rgba(36,255,122,0.18)]"
                  : "bg-white/5 text-[var(--fifa-mute)] ring-[var(--fifa-line)]"
              }`}
            >
              {isPrivate ? "Sí" : "No"}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              disabled={loading}
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-[0_0_22px_rgba(36,255,122,0.22)] transition disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear club"}
            </button>

            <Link
              to="/home"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--fifa-mute)] ring-1 ring-[var(--fifa-line)] hover:text-[var(--fifa-text)] hover:ring-[var(--fifa-cyan)]/30 transition"
            >
              Volver
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
