import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";

export default function CreateClub() {
  const navigate = useNavigate();
  const { setClubContext } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    country: "",
  });

  const [loading, setLoading] = useState(false);

  const onChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const country = form.country.trim();

    if (!name) {
      toast.error("Debes ingresar el nombre del club.");
      return;
    }

    if (!country) {
      toast.error("Debes ingresar el país del club.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/clubs", {
        name,
        country,
      });

      const createdClub = res?.data?.club || res?.data?.data || res?.data;

      const createdClubId =
        createdClub?._id || createdClub?.id || res?.data?.clubId || "";

      if (createdClubId) {
        setClubContext({
          clubId: createdClubId,
          role: "admin",
        });
      }

      toast.success("Club creado correctamente.");
      navigate("/home");
    } catch (e) {
      const status = e?.response?.status;
      const backendMessage = e?.response?.data?.message;

      if (status === 409) {
        toast.error(backendMessage || "Ya existe un club con ese nombre.");
        return;
      }

      toast.error(backendMessage || e.message || "No se pudo crear el club");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fifa-radial">
      <div className="mx-auto max-w-xl px-4 py-10 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold text-fifa-text">Crear club</h1>

          <p className="text-fifa-mute">
            Completa los datos básicos para registrar tu club.
          </p>
        </div>

        <div className="rounded-2xl border border-fifa-line bg-fifa-card shadow-glow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-fifa-mute">
                Nombre del club
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Ej: FC Prueba Final"
                className="
                  w-full rounded-xl px-4 py-3
                  bg-black/30 text-fifa-text
                  border border-fifa-line
                  focus:outline-none
                  focus:border-fifa-blue
                "
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-fifa-mute">País</label>

              <input
                type="text"
                value={form.country}
                onChange={(e) => onChange("country", e.target.value)}
                placeholder="Ej: Chile"
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
              {loading ? "Creando..." : "Crear club"}
            </button>
          </form>

          <p className="mt-4 text-xs text-fifa-mute text-center">
            Al crear el club quedarás como administrador inicial.
          </p>
        </div>
      </div>
    </div>
  );
}