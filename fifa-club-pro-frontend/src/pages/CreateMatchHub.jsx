import { useNavigate } from "react-router-dom";
import { Image, PencilLine, ArrowLeft } from "lucide-react";

function cardClass() {
  return "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";
}

export default function CreateMatchHub() {
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      <div className={cardClass()}>
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
        FIFA Club Pro
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
        Crear partido manual
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Flujo manual completo para registrar el partido con contexto, marcador,
        stats del club y estadísticas de jugadores.
      </p>
    </div>

    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => navigate("/matches/create")}
        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Volver
      </button>

      <button
        type="button"
        onClick={() => navigate("/matches")}
        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Ir a partidos
      </button>
    </div>
  </div>
</div>

      <div className="grid gap-6 xl:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/matches/create/manual")}
          className="group rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
              ✏️
            </div>

            <div className="rounded-full border border-emerald-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
              Recomendado para control total
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-bold text-white">
            Ingresar datos manuales
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Registra el partido con rival, condición local/visita, score, team
            stats y player stats de forma directa, clara y completa.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <div className="font-semibold text-white">Incluye:</div>
            <div className="mt-2 space-y-1">
              <div>• Contexto del partido</div>
              <div>• Marcador</div>
              <div>• Team stats</div>
              <div>• Player stats</div>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-500">
            Ir al flujo manual
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/matches/create/images")}
          className="group rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-sky-500/5 p-6 text-left transition hover:border-sky-400/30 hover:bg-sky-500/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sky-200">
              🖼️
            </div>

            <div className="rounded-full border border-sky-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200/90">
              IA asistida
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-bold text-white">
            Ingresar datos por imágenes
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sube capturas del partido para que la IA intente detectar el
            marcador. El contexto del partido lo defines tú desde el sistema.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <div className="font-semibold text-white">Incluye:</div>
            <div className="mt-2 space-y-1">
              <div>• Selección de rival</div>
              <div>• Local / visita</div>
              <div>• Procesamiento IA</div>
              <div>• Validación antes de guardar</div>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-sky-500">
            Ir al flujo por imágenes
          </div>
        </button>
      </div>
    </section>
  );
}