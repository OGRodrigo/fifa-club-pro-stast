// src/components/matches/MatchDraftReviewForm.jsx
function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/80">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/35 focus:border-emerald-400/50"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <InputField
      label={label}
      type="number"
      value={value ?? ""}
      onChange={(val) => onChange(val === "" ? null : Number(val))}
    />
  );
}

export default function MatchDraftReviewForm({
  draft,
  setDraft,
  confidence,
  missingFields = [],
  conflicts = [],
  notes = [],
}) {
  if (!draft) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold text-white">
          Revisión del borrador
        </h3>
        <p className="mt-2 text-sm text-white/60">
          Aún no hay borrador generado.
        </p>
      </div>
    );
  }

  const stats = draft.stats || {};

  const updateRoot = (key, value) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateNestedClub = (clubKey, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [clubKey]: {
        ...(prev?.[clubKey] || {}),
        [field]: value,
      },
    }));
  };

  const updateStat = (key, value) => {
    setDraft((prev) => ({
      ...prev,
      stats: {
        ...(prev?.stats || {}),
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <h3 className="text-lg font-semibold text-white">
          Revisión del borrador
        </h3>
        <p className="mt-1 text-sm text-white/70">
          Corrige manualmente cualquier dato antes de crear el partido real.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Club local"
          value={draft.homeClub?.name ?? ""}
          onChange={(value) => updateNestedClub("homeClub", "name", value)}
          placeholder="Ej: KKTeam"
        />

        <InputField
          label="Club visita"
          value={draft.awayClub?.name ?? ""}
          onChange={(value) => updateNestedClub("awayClub", "name", value)}
          placeholder="Ej: Fecha Libre eSp"
        />

        <NumberField
          label="Goles local"
          value={draft.scoreHome}
          onChange={(value) => updateRoot("scoreHome", value)}
        />

        <NumberField
          label="Goles visita"
          value={draft.scoreAway}
          onChange={(value) => updateRoot("scoreAway", value)}
        />

        <InputField
          label="Minuto / tiempo detectado"
          value={draft.minute ?? ""}
          onChange={(value) => updateRoot("minute", value)}
          placeholder="Ej: 92:08"
        />

        <InputField
          label="Estado"
          value={draft.status ?? ""}
          onChange={(value) => updateRoot("status", value)}
          placeholder="Ej: final"
        />

        <InputField
          label="Temporada"
          value={draft.season ?? ""}
          onChange={(value) => updateRoot("season", value)}
          placeholder="Ej: 2026"
        />
      </div>

      <div>
        <h4 className="mb-4 text-base font-semibold text-white">
          Estadísticas agregadas
        </h4>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NumberField
            label="Posesión local"
            value={stats.possessionHome}
            onChange={(value) => updateStat("possessionHome", value)}
          />
          <NumberField
            label="Posesión visita"
            value={stats.possessionAway}
            onChange={(value) => updateStat("possessionAway", value)}
          />

          <NumberField
            label="Tiros local"
            value={stats.shotsHome}
            onChange={(value) => updateStat("shotsHome", value)}
          />
          <NumberField
            label="Tiros visita"
            value={stats.shotsAway}
            onChange={(value) => updateStat("shotsAway", value)}
          />

          <NumberField
            label="Tiros a puerta local"
            value={stats.shotsOnTargetHome}
            onChange={(value) => updateStat("shotsOnTargetHome", value)}
          />
          <NumberField
            label="Tiros a puerta visita"
            value={stats.shotsOnTargetAway}
            onChange={(value) => updateStat("shotsOnTargetAway", value)}
          />

          <NumberField
            label="Pases local"
            value={stats.passesHome}
            onChange={(value) => updateStat("passesHome", value)}
          />
          <NumberField
            label="Pases visita"
            value={stats.passesAway}
            onChange={(value) => updateStat("passesAway", value)}
          />

          <NumberField
            label="Precisión de pase local"
            value={stats.passAccuracyHome}
            onChange={(value) => updateStat("passAccuracyHome", value)}
          />
          <NumberField
            label="Precisión de pase visita"
            value={stats.passAccuracyAway}
            onChange={(value) => updateStat("passAccuracyAway", value)}
          />

          <NumberField
            label="Entradas local"
            value={stats.tacklesHome}
            onChange={(value) => updateStat("tacklesHome", value)}
          />
          <NumberField
            label="Entradas visita"
            value={stats.tacklesAway}
            onChange={(value) => updateStat("tacklesAway", value)}
          />

          <NumberField
            label="Recuperaciones local"
            value={stats.recoveriesHome}
            onChange={(value) => updateStat("recoveriesHome", value)}
          />
          <NumberField
            label="Recuperaciones visita"
            value={stats.recoveriesAway}
            onChange={(value) => updateStat("recoveriesAway", value)}
          />

          <NumberField
            label="Atajadas local"
            value={stats.savesHome}
            onChange={(value) => updateStat("savesHome", value)}
          />
          <NumberField
            label="Atajadas visita"
            value={stats.savesAway}
            onChange={(value) => updateStat("savesAway", value)}
          />

          <NumberField
            label="Faltas local"
            value={stats.foulsHome}
            onChange={(value) => updateStat("foulsHome", value)}
          />
          <NumberField
            label="Faltas visita"
            value={stats.foulsAway}
            onChange={(value) => updateStat("foulsAway", value)}
          />

          <NumberField
            label="Offside local"
            value={stats.offsidesHome}
            onChange={(value) => updateStat("offsidesHome", value)}
          />
          <NumberField
            label="Offside visita"
            value={stats.offsidesAway}
            onChange={(value) => updateStat("offsidesAway", value)}
          />

          <NumberField
            label="Corners local"
            value={stats.cornersHome}
            onChange={(value) => updateStat("cornersHome", value)}
          />
          <NumberField
            label="Corners visita"
            value={stats.cornersAway}
            onChange={(value) => updateStat("cornersAway", value)}
          />

          <NumberField
            label="Amarillas local"
            value={stats.yellowCardsHome}
            onChange={(value) => updateStat("yellowCardsHome", value)}
          />
          <NumberField
            label="Amarillas visita"
            value={stats.yellowCardsAway}
            onChange={(value) => updateStat("yellowCardsAway", value)}
          />

          <NumberField
            label="Rojas local"
            value={stats.redCardsHome}
            onChange={(value) => updateStat("redCardsHome", value)}
          />
          <NumberField
            label="Rojas visita"
            value={stats.redCardsAway}
            onChange={(value) => updateStat("redCardsAway", value)}
          />

          <NumberField
            label="xG local"
            value={stats.xgHome}
            onChange={(value) => updateStat("xgHome", value)}
          />
          <NumberField
            label="xG visita"
            value={stats.xgAway}
            onChange={(value) => updateStat("xgAway", value)}
          />

          <NumberField
            label="Éxito en regates local"
            value={stats.dribbleSuccessHome}
            onChange={(value) => updateStat("dribbleSuccessHome", value)}
          />
          <NumberField
            label="Éxito en regates visita"
            value={stats.dribbleSuccessAway}
            onChange={(value) => updateStat("dribbleSuccessAway", value)}
          />

          <NumberField
            label="Precisión de tiro local"
            value={stats.shotAccuracyHome}
            onChange={(value) => updateStat("shotAccuracyHome", value)}
          />
          <NumberField
            label="Precisión de tiro visita"
            value={stats.shotAccuracyAway}
            onChange={(value) => updateStat("shotAccuracyAway", value)}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h5 className="mb-3 text-sm font-semibold text-white">
            Confianza estimada
          </h5>
          <div className="space-y-2 text-sm text-white/80">
            <p>Overall: {confidence?.overall ?? 0}</p>
            <p>Score: {confidence?.score ?? 0}</p>
            <p>Clubs: {confidence?.clubs ?? 0}</p>
            <p>Stats: {confidence?.stats ?? 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h5 className="mb-3 text-sm font-semibold text-white">
            Missing fields
          </h5>
          {missingFields.length ? (
            <ul className="space-y-1 text-sm text-yellow-300/90">
              {missingFields.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/60">Sin campos faltantes.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h5 className="mb-3 text-sm font-semibold text-white">
            Notes / conflicts
          </h5>

          <div className="space-y-3 text-sm">
            {conflicts.length ? (
              <div>
                <p className="mb-1 font-medium text-red-300">Conflicts</p>
                <ul className="space-y-1 text-red-200/90">
                  {conflicts.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {notes.length ? (
              <div>
                <p className="mb-1 font-medium text-emerald-300">Notes</p>
                <ul className="space-y-1 text-white/75">
                  {notes.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!conflicts.length && !notes.length ? (
              <p className="text-white/60">Sin observaciones.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}