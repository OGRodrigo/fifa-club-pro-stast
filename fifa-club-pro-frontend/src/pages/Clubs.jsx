// src/pages/Clubs.jsx
// NOTA: Esta pantalla es "privada" (solo debería verse con sesión iniciada).
// Aquí SOLO listamos clubs y permitimos seleccionar uno para definir el contexto clubId + role.
// src/pages/Clubs.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { requestJoinClub } from "../api/clubs";

export default function Clubs() {
  const { setClubContext } = useAuth();

  const [clubs, setClubs] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadClubs() {
      try {
        setLoading(true);
        setErr("");

        const res = await api.get("/clubs");
        if (!alive) return;

        setClubs(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Error al cargar clubs");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadClubs();

    return () => {
      alive = false;
    };
  }, []);

  const enterClub = async (clubId) => {
    try {
      setActionLoadingId(clubId);

      // Este endpoint solo funciona si YA perteneces al club
      const res = await api.get(`/clubs/${clubId}/me`);

      setClubContext({
        clubId,
        role: res.data.role,
      });

      alert("✅ Club seleccionado correctamente. Ahora puedes volver a Inicio.");
    } catch (e) {
      const status = e?.response?.status;
      const message =
        e?.response?.data?.message || e.message || "No se pudo seleccionar el club";

      // Si da 403, probablemente no pertenece al club todavía
      if (status === 403) {
        alert("No perteneces a este club todavía. Envía una solicitud para unirte.");
        return;
      }

      alert(message);
    } finally {
      setActionLoadingId("");
    }
  };

  const joinClub = async (clubId) => {
    try {
      setActionLoadingId(clubId);

      await requestJoinClub(clubId);

      alert("✅ Solicitud enviada correctamente.");
    } catch (e) {
      const message =
        e?.response?.data?.message || e.message || "No se pudo enviar la solicitud";
      alert(message);
    } finally {
      setActionLoadingId("");
    }
  };

  if (loading) {
    return <div className="p-6 text-fifa-mute">Cargando clubs...</div>;
  }

  if (err) {
    return <div className="p-6 text-red-400">Error: {err}</div>;
  }

  return (
    <div className="min-h-screen bg-fifa-radial">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-fifa-text">Clubs</h1>
          <p className="text-fifa-mute">
            Puedes entrar a un club si ya perteneces a él, o enviar una solicitud para unirte.
          </p>
        </div>

        {clubs.length === 0 ? (
          <div className="rounded-xl border border-fifa-line bg-fifa-panel/80 p-5 text-fifa-mute">
            No hay clubs disponibles.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((c) => {
              const isBusy = actionLoadingId === c._id;

              return (
                <div
                  key={c._id}
                  className="rounded-2xl border border-fifa-line bg-fifa-card shadow-glow p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-fifa-text">
                        {c.name}
                      </div>
                      <div className="text-sm text-fifa-mute">{c.country}</div>
                    </div>

                    <div className="text-xs px-2 py-1 rounded-full border border-fifa-line text-fifa-mute">
                      FIFA PRO
                    </div>
                  </div>

                  <div className="my-4 h-px bg-fifa-line" />

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => enterClub(c._id)}
                      disabled={isBusy}
                      className="
                        w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                        bg-fifa-blue text-white
                        hover:opacity-90 active:opacity-80
                        shadow-neon disabled:opacity-60
                      "
                    >
                      {isBusy ? "Procesando..." : "Entrar si ya pertenezco"}
                    </button>

                    <button
                      type="button"
                      onClick={() => joinClub(c._id)}
                      disabled={isBusy}
                      className="
                        w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                        bg-white/5 text-fifa-text
                        border border-fifa-line
                        hover:border-fifa-blue hover:bg-white/10
                        disabled:opacity-60
                      "
                    >
                      {isBusy ? "Procesando..." : "Solicitar unirme"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-fifa-mute">
                    Si ya eres miembro, usa “Entrar”. Si aún no perteneces, usa “Solicitar unirme”.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}