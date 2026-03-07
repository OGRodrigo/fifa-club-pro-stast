// src/season/SeasonSelect.jsx
import { useEffect, useState } from "react";
import { api } from "../api/client";

/**
 * SeasonSelect
 * - Carga temporadas desde GET /league/seasons
 * - value: string (ej "2026")
 */
export default function SeasonSelect({ value, onChange, className = "" }) {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get("/league/seasons");
        const list = Array.isArray(res.data?.seasons) ? res.data.seasons : [];

        if (!alive) return;
        setSeasons(list);

        // Si no hay value y hay temporadas, selecciona la primera (más reciente)
        if (!value && list.length > 0) onChange(String(list[0]));
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Error");
        setSeasons([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <div className="text-xs text-[var(--fifa-mute)] mb-2">Temporada</div>

      <select
        className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || seasons.length === 0}
      >
        {seasons.length === 0 ? (
          <option value="">
            {loading ? "Cargando..." : err ? "Sin temporadas" : "Sin temporadas"}
          </option>
        ) : (
          seasons.map((s) => (
            <option key={s} value={String(s)}>
              {s}
            </option>
          ))
        )}
      </select>

      {err ? (
        <div className="mt-2 text-xs text-[var(--fifa-danger)]">{err}</div>
      ) : null}
    </div>
  );
}