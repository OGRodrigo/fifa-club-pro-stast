import { useState } from "react";
import { requestJoinClub } from "../api/clubs";
import { useToast } from "../ui/ToastContext";

export default function Clubs() {
  const toast = useToast();

  const [clubId, setClubId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();

    if (!clubId.trim()) {
      toast.error("Debes ingresar un ID de club.");
      return;
    }

    try {
      setLoading(true);

      await requestJoinClub(clubId.trim());

      toast.success("Solicitud enviada correctamente.");
      setClubId("");
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e.message ||
        "No se pudo enviar la solicitud";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fifa-radial">
      <div className="mx-auto max-w-xl px-4 py-10 space-y-6">

        {/* HEADER */}
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold text-fifa-text">
            Unirse a club
          </h1>

          <p className="text-fifa-mute">
            Ingresa el ID del club al que deseas solicitar ingreso.
          </p>
        </div>

        {/* CARD */}
        <div className="rounded-2xl border border-fifa-line bg-fifa-card shadow-glow p-6">

          <form onSubmit={handleJoin} className="space-y-4">

            <div className="space-y-2">
              <label className="text-sm text-fifa-mute">
                ID del club
              </label>

              <input
                type="text"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                placeholder="Ej: 664b4a8f4f5b3c0012ab34cd"
                className="
                  w-full rounded-xl px-4 py-3
                  bg-black/30 text-fifa-text
                  border border-fifa-line
                  focus:outline-none
                  focus:border-fifa-blue
                "
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                w-full rounded-xl px-4 py-3
                text-sm font-semibold
                bg-fifa-blue text-white
                hover:opacity-90 active:opacity-80
                shadow-neon disabled:opacity-60
              "
            >
              {loading ? "Enviando..." : "Solicitar ingreso"}
            </button>

          </form>

          <p className="mt-4 text-xs text-fifa-mute text-center">
            El administrador del club deberá aprobar tu solicitud.
          </p>

        </div>
      </div>
    </div>
  );
}