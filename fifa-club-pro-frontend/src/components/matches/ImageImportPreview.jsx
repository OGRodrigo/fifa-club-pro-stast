// src/components/matches/ImageImportPreview.jsx
export default function ImageImportPreview({
  images = [],
  previews = [],
  onRemove,
  disabled = false,
}) {
  if (!images.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold text-white">Vista previa</h3>
        <p className="mt-2 text-sm text-white/60">
          Aún no has cargado imágenes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Vista previa</h3>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
          >
            <div className="aspect-video bg-black/40">
              {previews[index] ? (
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/50">
                  Sin preview
                </div>
              )}
            </div>

            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-medium text-white">
                {file.name}
              </p>
              <p className="text-xs text-white/60">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove?.(index)}
                className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}