// src/pages/ImportMatchImages.jsx
import { useEffect, useMemo, useState } from "react";
import ImageImportUploader from "../components/matches/ImageImportUploader";
import ImageImportPreview from "../components/matches/ImageImportPreview";
import MatchDraftReviewForm from "../components/matches/MatchDraftReviewForm";
import { parseMatchImages } from "../services/aiMatchImport";

export default function ImportMatchImages() {
  const [images, setImages] = useState([]);
  const [season, setSeason] = useState("2026");
  const [source, setSource] = useState("ea_fc_match_screens");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);

  const previews = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images]
  );

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const onFilesSelected = (newFiles) => {
    setError("");
    setResult(null);
    setDraft(null);

    setImages((prev) => [...prev, ...newFiles]);
  };

  const onRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const onAnalyze = async () => {
    if (!images.length) {
      setError("Debes cargar al menos una imagen.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await parseMatchImages({
        images,
        season,
        source,
      });

      setResult(data);
      setDraft(data?.matchDraft || null);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "No se pudieron procesar las imágenes."
      );
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setImages([]);
    setResult(null);
    setDraft(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,_#081225_0%,_#050b18_100%)] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-emerald-400/20 bg-black/20 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
            IA · Importación de partidos
          </div>

          <h1 className="text-3xl font-black uppercase tracking-wide text-white md:text-4xl">
            Importar partido por imágenes
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70 md:text-base">
            Sube varias capturas del mismo partido para generar un borrador con
            marcador, equipos y estadísticas agregadas. Esta versión no guarda
            automáticamente: primero revisas y corriges.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Configuración
              </h2>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/80">
                    Temporada
                  </span>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-emerald-400/50"
                    placeholder="Ej: 2026"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/80">
                    Fuente
                  </span>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-emerald-400/50"
                    placeholder="Ej: ea_fc_match_screens"
                  />
                </label>
              </div>
            </div>

            <ImageImportUploader
              images={images}
              onFilesSelected={onFilesSelected}
              disabled={loading}
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onAnalyze}
                  className="flex-1 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Analizando..." : "Analizar imágenes"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={onReset}
                  className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpiar
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <ImageImportPreview
              images={images}
              previews={previews}
              onRemove={onRemoveImage}
              disabled={loading}
            />

            <MatchDraftReviewForm
              draft={draft}
              setDraft={setDraft}
              confidence={result?.confidence}
              missingFields={result?.missingFields || []}
              conflicts={result?.conflicts || []}
              notes={result?.notes || []}
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-lg font-semibold text-white">
                Próximo paso
              </h3>
              <p className="text-sm leading-6 text-white/70">
                En el siguiente bloque conectaremos este borrador con el flujo
                actual de creación de partidos, para que puedas confirmar y
                guardar sin romper lo que ya funciona.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}