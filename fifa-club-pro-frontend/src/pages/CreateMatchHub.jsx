import { useNavigate } from "react-router-dom";

export default function CreateMatchHub() {
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold text-white">Crear partido</h1>
        <p className="mt-2 text-sm text-slate-300">
          Elige cómo quieres ingresar el partido.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/matches/create/manual")}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-left transition hover:bg-emerald-500/10"
        >
          <div className="text-lg font-semibold text-emerald-100">
            Ingresar datos manuales
          </div>

          <p className="mt-2 text-sm text-slate-300">
            Crea el partido completando rival, condición local/visita, score,
            stats, alineación y estadísticas de jugadores.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/matches/create/images")}
          className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 text-left transition hover:bg-sky-500/10"
        >
          <div className="text-lg font-semibold text-sky-100">
            Ingresar datos por imágenes
          </div>

          <p className="mt-2 text-sm text-slate-300">
            Sube capturas del partido. La IA intentará detectar marcador y
            estadísticas. Si detecta un club que no existe en la base de datos,
            se mostrará un aviso visual para revisarlo manualmente.
          </p>
        </button>
      </div>
    </section>
  );
}