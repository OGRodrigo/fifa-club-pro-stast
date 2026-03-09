// src/components/FifaLoader.jsx

export default function FifaLoader({ text = "Cargando..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-fifa-radial">

      <div className="flex flex-col items-center gap-6">

        {/* Spinner */}
        <div className="relative h-16 w-16">

          <div className="absolute inset-0 rounded-full border-4 border-fifa-line"></div>

          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--fifa-neon)] animate-spin"></div>

        </div>

        {/* Texto */}
        <div className="text-sm text-fifa-mute tracking-widest">
          {text}
        </div>

      </div>

    </div>
  );
}