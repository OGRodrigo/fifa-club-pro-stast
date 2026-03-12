import { useMemo, useState } from "react";
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
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const normalizedName = useMemo(() => form.name.trim(), [form.name]);
  const normalizedCountry = useMemo(() => form.country.trim(), [form.country]);

  const onChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (err) setErr("");
    if (ok) setOk("");
  };

  function validateForm() {
    if (!normalizedName) {
      return "Debes ingresar el nombre del club.";
    }

    if (normalizedName.length < 3) {
      return "El nombre del club debe tener al menos 3 caracteres.";
    }

    if (!normalizedCountry) {
      return "Debes ingresar el país del club.";
    }

    return "";
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErr(validationError);
      setOk("");
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);
      setErr("");
      setOk("");

      const res = await api.post("/clubs", {
        name: normalizedName,
        country: normalizedCountry,
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

      setOk("Club creado correctamente. Entrando al panel...");
      toast.success("Club creado correctamente.");
      navigate("/home");
    } catch (e) {
      const status = e?.response?.status;
      const backendMessage = e?.response?.data?.message;

      let message = backendMessage || e.message || "No se pudo crear el club";

      if (status === 409) {
        message = backendMessage || "Ya existe un club con ese nombre.";
      }

      setErr(message);
      setOk("");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fifa-radial">
      <div className="mx-auto max-w-xl px-4 py-10 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-fifa-text">Crear club</h1>

          <p className="text-fifa-mute">
            Registra tu club con su nombre y país. Al crearlo quedarás como
            administrador inicial.
          </p>
        </div>

        <div className="rounded-2xl border border-fifa-line bg-fifa-card shadow-glow p-6">
          <div className="mb-5 rounded-xl bg-black/20 p-4 ring-1 ring-[var(--fifa-line)]">
            <div className="text-sm font-semibold text-fifa-text">
              Recomendación
            </div>
            <div className="mt-1 text-sm text-fifa-mute">
              Usa un nombre claro y único para evitar duplicados en el sistema.
            </div>
          </div>

          {err ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {err}
            </div>
          ) : null}

          {ok ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {ok}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-fifa-mute">
                Nombre del club
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Ej: FC Prueba Final"
                disabled={loading}
                className="
                  w-full rounded-xl px-4 py-3
                  bg-black/30 text-fifa-text
                  border border-fifa-line
                  focus:outline-none focus:border-fifa-blue
                  disabled:opacity-60
                "
              />

              <p className="text-xs text-fifa-mute">
                Mínimo 3 caracteres.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-fifa-mute">País</label>

              <input
                type="text"
                value={form.country}
                onChange={(e) => onChange("country", e.target.value)}
                placeholder="Ej: Chile"
                disabled={loading}
                className="
                  w-full rounded-xl px-4 py-3
                  bg-black/30 text-fifa-text
                  border border-fifa-line
                  focus:outline-none focus:border-fifa-blue
                  disabled:opacity-60
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
              {loading ? "Creando club..." : "Crear club"}
            </button>
          </form>

          <p className="mt-4 text-xs text-fifa-mute text-center">
            El sistema validará si ya existe un club con ese nombre.
          </p>
        </div>
      </div>
    </div>
  );
}