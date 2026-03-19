// src/components/matches/ImageImportUploader.jsx
export default function ImageImportUploader({
  images = [],
  onFilesSelected,
  disabled = false,
}) {
  const onChange = (e) => {
    const files = Array.from(e.target.files || []);
    onFilesSelected?.(files);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">
          Cargar imágenes del partido
        </h3>
        <p className="mt-1 text-sm text-white/70">
          Puedes subir varias capturas del mismo partido: resumen, tiros, pases,
          defensa, posesión, etc.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-400/40 bg-black/20 p-6 text-center transition hover:border-emerald-400/70 hover:bg-black/30">
        <span className="mb-2 text-sm font-medium text-emerald-300">
          Seleccionar imágenes
        </span>
        <span className="text-xs text-white/60">
          JPG, PNG o WEBP · múltiples archivos
        </span>

        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={onChange}
        />
      </label>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-white/70">
          Archivos cargados:{" "}
          <span className="font-semibold text-white">{images.length}</span>
        </span>
      </div>
    </div>
  );
}