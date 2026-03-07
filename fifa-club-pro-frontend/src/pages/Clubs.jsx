// src/pages/Clubs.jsx
// NOTA: Esta pantalla es "privada" (solo debería verse con sesión iniciada).
// Aquí SOLO listamos clubs y permitimos seleccionar uno para definir el contexto clubId + role.

import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Clubs() {
  const { setClubContext } = useAuth();

  const [clubs, setClubs] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NOTA: Traemos clubs del backend.
    // Si el backend está protegido, tu api client debería mandar el token (lo vemos después).
    api
      .get("/clubs")
      .then((res) => setClubs(res.data || []))
      .catch((e) => setErr(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectClub = async (clubId) => {
    try {
      // NOTA: este endpoint te devuelve tu rol en ese club
      // y con eso guardamos el contexto.
      const res = await api.get(`/clubs/${clubId}/me`);

      // Guardamos en el AuthContext el club actual y rol (admin / member)
      setClubContext({ clubId, role: res.data.role });

      alert("✅ Club seleccionado. Vuelve a Inicio.");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  // UI de estados
  if (loading) return <div className="p-6 text-fifa-mute">Cargando clubs...</div>;
  if (err) return <div className="p-6 text-red-400">Error: {err}</div>;

  return (
    // Fondo tipo FIFA (si tu tailwind.config está cargando, esta clase existe)
    <div className="min-h-screen bg-fifa-radial">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-fifa-text">Clubs (Privados)</h1>
          <p className="text-fifa-mute">
            Selecciona un club para entrar y definir tu rol (admin o miembro).
          </p>
        </div>

        {/* Grid */}
        {clubs.length === 0 ? (
          <div className="rounded-xl border border-fifa-line bg-fifa-panel/80 p-5 text-fifa-mute">
            No hay clubs disponibles.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((c) => (
              <div
                key={c._id}
                className="
                  rounded-2xl border border-fifa-line
                  bg-fifa-card shadow-glow
                  p-5
                "
              >
                {/* Título */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-fifa-text">
                      {c.name}
                    </div>
                    <div className="text-sm text-fifa-mute">{c.country}</div>
                  </div>

                  {/* Etiqueta tipo “badge” (solo visual) */}
                  <div className="text-xs px-2 py-1 rounded-full border border-fifa-line text-fifa-mute">
                    FIFA PRO
                  </div>
                </div>

                {/* Separador */}
                <div className="my-4 h-px bg-fifa-line" />

                {/* Botón */}
                <button
                  onClick={() => selectClub(c._id)}
                  className="
                    w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                    bg-fifa-blue text-white
                    hover:opacity-90 active:opacity-80
                    shadow-neon
                  "
                >
                  Seleccionar este club
                </button>

                {/* Nota visual */}
                <p className="mt-3 text-xs text-fifa-mute">
                  Consejo: el rol define pantallas distintas (admin vs miembro).
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
