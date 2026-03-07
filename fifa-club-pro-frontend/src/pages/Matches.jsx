import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const emptyPS = (clubId = "") => ({
  user: "",
  club: clubId,
  goals: 0,
  assists: 0,
});

const initialEditMatchState = {
  open: false,
  saving: false,
  matchId: "",
  homeClub: "",
  awayClub: "",
  date: "",
  stadium: "",
  scoreHome: 0,
  scoreAway: 0,
};

const initialEditStatsState = {
  open: false,
  saving: false,
  matchId: "",
  homeClub: "",
  awayClub: "",
  scoreHome: 0,
  scoreAway: 0,
  myClubSideId: "",
  playerStats: [],
  rivalPlayerStats: [],
};

export default function Matches() {
  const { clubContext } = useAuth();
  const myClubId = clubContext?.clubId || "";

  // =========================
  // Datos base
  // =========================
  const [clubs, setClubs] = useState([]);
  const [myMembers, setMyMembers] = useState([]);

  // =========================
  // Mis partidos
  // =========================
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesErr, setMatchesErr] = useState("");

  // =========================
  // Carga base
  // =========================
  const [loadingBase, setLoadingBase] = useState(true);
  const [baseErr, setBaseErr] = useState("");

  // =========================
  // Form partido
  // =========================
  const [homeClub, setHomeClub] = useState("");
  const [awayClub, setAwayClub] = useState("");
  const [date, setDate] = useState("");
  const [stadium, setStadium] = useState("");
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);

  const [playerStats, setPlayerStats] = useState([emptyPS()]);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState("");

  // =========================
  // Editar partido
  // =========================
  const [editMatch, setEditMatch] = useState(initialEditMatchState);
  const [editMatchErr, setEditMatchErr] = useState("");
  const [editMatchOk, setEditMatchOk] = useState("");

  // =========================
  // Editar playerStats
  // =========================
  const [editStats, setEditStats] = useState(initialEditStatsState);
  const [editStatsErr, setEditStatsErr] = useState("");
  const [editStatsOk, setEditStatsOk] = useState("");

  // =========================
  // Cargar clubs + roster real de MI club
  // =========================
  useEffect(() => {
    let alive = true;

    async function loadBase() {
      try {
        setLoadingBase(true);
        setBaseErr("");

        const requests = [api.get("/clubs")];

        if (myClubId) {
          requests.push(api.get(`/clubs/${myClubId}/members`));
        }

        const responses = await Promise.all(requests);

        if (!alive) return;

        const clubsRes = responses[0];
        const membersRes = responses[1];

        setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);

        if (membersRes) {
          const members = Array.isArray(membersRes.data?.members)
            ? membersRes.data.members
            : [];

          const mappedMembers = members
            .map((m) => {
              const u = m?.user;
              if (!u?._id) return null;

              return {
                id: u._id,
                username: u.username || "",
                gamerTag: u.gamerTag || "",
                platform: u.platform || "",
                label: `${u.gamerTag || u.username}${u.platform ? ` · ${u.platform}` : ""}`,
              };
            })
            .filter(Boolean);

          setMyMembers(mappedMembers);
        } else {
          setMyMembers([]);
        }
      } catch (e) {
        if (!alive) return;
        setBaseErr(e?.response?.data?.message || e.message);
      } finally {
        if (alive) setLoadingBase(false);
      }
    }

    loadBase();

    return () => {
      alive = false;
    };
  }, [myClubId]);

  // =========================
  // Cargar partidos de mi club
  // =========================
  const loadMyMatches = async () => {
    if (!myClubId) {
      setMatches([]);
      return;
    }

    try {
      setMatchesLoading(true);
      setMatchesErr("");

      const res = await api.get("/matches", {
        params: {
          club: myClubId,
          page: 1,
          limit: 50,
        },
      });

      setMatches(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      setMatchesErr(e?.response?.data?.message || e.message);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  };

  useEffect(() => {
    loadMyMatches();
  }, [myClubId]);

  const clubOptions = useMemo(() => {
    return clubs.map((c) => ({
      id: c._id,
      label: `${c.name}${c.country ? ` · ${c.country}` : ""}`,
      name: c.name,
    }));
  }, [clubs]);

  const clubMap = useMemo(() => {
    return clubOptions.reduce((acc, club) => {
      acc[club.id] = club;
      return acc;
    }, {});
  }, [clubOptions]);

  const memberMap = useMemo(() => {
    return myMembers.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {});
  }, [myMembers]);

  const selectedHome = clubOptions.find((c) => c.id === homeClub);
  const selectedAway = clubOptions.find((c) => c.id === awayClub);
  const myClub = clubOptions.find((c) => c.id === myClubId);

  const myClubIsHome = homeClub && myClubId && homeClub === myClubId;
  const myClubIsAway = awayClub && myClubId && awayClub === myClubId;
  const myClubSelectedSideId = myClubIsHome ? homeClub : myClubIsAway ? awayClub : "";

  const matchIncludesMyClub =
    Boolean(myClubId) && (homeClub === myClubId || awayClub === myClubId);

  const canSubmit =
    homeClub &&
    awayClub &&
    homeClub !== awayClub &&
    date &&
    stadium &&
    Number(scoreHome) >= 0 &&
    Number(scoreAway) >= 0 &&
    matchIncludesMyClub &&
    !saving &&
    !loadingBase;

  // =========================
  // Cuando cambia lado de mi club, ajustar club en playerStats
  // =========================
  useEffect(() => {
    if (!myClubSelectedSideId) return;

    setPlayerStats((prev) =>
      prev.map((ps) => ({
        ...ps,
        club: myClubSelectedSideId,
      }))
    );
  }, [myClubSelectedSideId]);

  // =========================
  // Preselección: si tengo club, lo pongo de home al inicio
  // =========================
  useEffect(() => {
    if (!myClubId) return;

    setHomeClub((prev) => prev || myClubId);
    setPlayerStats((prev) =>
      prev.length > 0
        ? prev.map((ps) => ({ ...ps, club: myClubId }))
        : [emptyPS(myClubId)]
    );
  }, [myClubId]);

  // =========================
  // Helpers playerStats create
  // =========================
  const addPS = () =>
    setPlayerStats((prev) => [...prev, emptyPS(myClubSelectedSideId || "")]);

  const removePS = (idx) =>
    setPlayerStats((prev) => prev.filter((_, i) => i !== idx));

  const updatePS = (idx, patch) =>
    setPlayerStats((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );

  const clearForm = () => {
    setHomeClub(myClubId || "");
    setAwayClub("");
    setDate("");
    setStadium("");
    setScoreHome(0);
    setScoreAway(0);
    setPlayerStats([emptyPS(myClubId || "")]);
    setFormErr("");
    setFormOk("");
  };

  // =========================
  // Validación create
  // =========================
  const validate = () => {
    if (!myClubId) {
      return "No tienes club activo. No se puede registrar playerStats reales sin club.";
    }

    if (!homeClub || !awayClub || !date || !stadium) {
      return "Faltan campos: homeClub, awayClub, date o stadium.";
    }

    if (homeClub === awayClub) {
      return "homeClub y awayClub no pueden ser el mismo.";
    }

    if (!matchIncludesMyClub) {
      return "Debes crear un partido donde participe tu club.";
    }

    if (Number(scoreHome) < 0 || Number(scoreAway) < 0) {
      return "Marcador inválido.";
    }

    const cleaned = playerStats
      .map((ps) => ({
        user: ps.user,
        club: ps.club,
        goals: Number(ps.goals || 0),
        assists: Number(ps.assists || 0),
      }))
      .filter((ps) => ps.user && ps.club);

    const seen = new Set();

    for (const ps of cleaned) {
      const key = `${ps.user}-${ps.club}`;

      if (seen.has(key)) {
        return "Hay playerStats duplicados para el mismo user+club.";
      }
      seen.add(key);

      if (ps.club !== homeClub && ps.club !== awayClub) {
        return "playerStats.club debe ser homeClub o awayClub.";
      }

      if (ps.club !== myClubSelectedSideId) {
        return "Solo puedes registrar playerStats para tu club con la configuración actual.";
      }

      if (ps.goals < 0 || ps.assists < 0) {
        return "Goals/assists no pueden ser negativos.";
      }

      const maxGoals = ps.club === homeClub ? Number(scoreHome) : Number(scoreAway);

      if (ps.goals > maxGoals) {
        return "Goles del jugador exceden goles del club.";
      }

      if (ps.goals + ps.assists > maxGoals) {
        return "Goles + asistencias exceden goles del club.";
      }
    }

    return null;
  };

  const onCreate = async (e) => {
  e.preventDefault();
  setFormErr("");
  setFormOk("");

  const msg = validate();
  if (msg) {
    setFormErr(msg);
    return;
  }

  if (!myClubId) {
    setFormErr("No tienes club activo en sesión.");
    return;
  }

  const payloadPlayerStats = playerStats
    .map((ps) => ({
      user: ps.user,
      club: myClubSelectedSideId,
      goals: Number(ps.goals || 0),
      assists: Number(ps.assists || 0),
    }))
    .filter((ps) => ps.user && ps.club);

  try {
    setSaving(true);

    await api.post(`/matches/clubs/${myClubId}`, {
      homeClub,
      awayClub,
      date,
      stadium,
      scoreHome: Number(scoreHome),
      scoreAway: Number(scoreAway),
      playerStats: payloadPlayerStats,
    });

    setFormOk("✅ Partido creado con playerStats de tu club.");
    setDate("");
    setStadium("");
    setScoreHome(0);
    setScoreAway(0);
    setPlayerStats([emptyPS(myClubSelectedSideId || myClubId || "")]);

    await loadMyMatches();
  } catch (e2) {
    setFormErr(e2?.response?.data?.message || e2.message);
  } finally {
    setSaving(false);
  }
};

  // =========================
  // Helpers editar partido
  // =========================
  const openEditMatch = (match) => {
    setEditMatchErr("");
    setEditMatchOk("");
    setEditMatch({
      open: true,
      saving: false,
      matchId: match._id,
      homeClub: match?.homeClub?._id || match?.homeClub || "",
      awayClub: match?.awayClub?._id || match?.awayClub || "",
      date: match?.date ? new Date(match.date).toISOString().slice(0, 10) : "",
      stadium: match?.stadium || "",
      scoreHome: Number(match?.scoreHome ?? 0),
      scoreAway: Number(match?.scoreAway ?? 0),
    });
  };

  const closeEditMatch = () => {
    setEditMatch(initialEditMatchState);
    setEditMatchErr("");
    setEditMatchOk("");
  };

  const saveEditMatch = async (e) => {
  e.preventDefault();
  setEditMatchErr("");
  setEditMatchOk("");

  if (
    !editMatch.homeClub ||
    !editMatch.awayClub ||
    !editMatch.date ||
    !editMatch.stadium
  ) {
    setEditMatchErr("Todos los campos del partido son obligatorios.");
    return;
  }

  if (editMatch.homeClub === editMatch.awayClub) {
    setEditMatchErr("homeClub y awayClub no pueden ser el mismo.");
    return;
  }

  if (!myClubId) {
    setEditMatchErr("No tienes club activo en sesión.");
    return;
  }

  try {
    setEditMatch((prev) => ({ ...prev, saving: true }));

    await api.put(`/matches/${editMatch.matchId}/clubs/${myClubId}`, {
      homeClub: editMatch.homeClub,
      awayClub: editMatch.awayClub,
      date: editMatch.date,
      stadium: editMatch.stadium,
      scoreHome: Number(editMatch.scoreHome),
      scoreAway: Number(editMatch.scoreAway),
    });

    setEditMatchOk("✅ Partido actualizado.");
    await loadMyMatches();
  } catch (e) {
    setEditMatchErr(e?.response?.data?.message || e.message);
  } finally {
    setEditMatch((prev) => ({ ...prev, saving: false }));
  }
};

  // =========================
  // Helpers editar stats
  // =========================
  const openEditStats = async (match) => {
    try {
      setEditStatsErr("");
      setEditStatsOk("");

      const res = await api.get(`/matches/${match._id}/full`);
      const fullMatch = res.data;

      const homeId = fullMatch?.homeClub?._id || "";
      const awayId = fullMatch?.awayClub?._id || "";

      const mySideId =
        String(homeId) === String(myClubId)
          ? homeId
          : String(awayId) === String(myClubId)
          ? awayId
          : "";

      const rawStats = Array.isArray(fullMatch?.playerStats) ? fullMatch.playerStats : [];

      const myStats = rawStats
        .filter((ps) => {
          const psClub = ps?.club?._id || ps?.club || "";
          return String(psClub) === String(mySideId);
        })
        .map((ps) => ({
          user: ps?.user?._id || ps?.user || "",
          club: mySideId,
          goals: Number(ps?.goals || 0),
          assists: Number(ps?.assists || 0),
        }));

      const rivalStats = rawStats
        .filter((ps) => {
          const psClub = ps?.club?._id || ps?.club || "";
          return String(psClub) !== String(mySideId);
        })
        .map((ps) => ({
          user: ps?.user?._id || ps?.user || "",
          club: ps?.club?._id || ps?.club || "",
          goals: Number(ps?.goals || 0),
          assists: Number(ps?.assists || 0),
        }));

      setEditStats({
        open: true,
        saving: false,
        matchId: fullMatch._id,
        homeClub: homeId,
        awayClub: awayId,
        scoreHome: Number(fullMatch?.scoreHome ?? 0),
        scoreAway: Number(fullMatch?.scoreAway ?? 0),
        myClubSideId: mySideId,
        playerStats: myStats.length > 0 ? myStats : [emptyPS(mySideId)],
        rivalPlayerStats: rivalStats,
      });
    } catch (e) {
      setMatchesErr(e?.response?.data?.message || e.message);
    }
  };

  const closeEditStats = () => {
    setEditStats(initialEditStatsState);
    setEditStatsErr("");
    setEditStatsOk("");
  };

  const addEditStatsRow = () => {
    setEditStats((prev) => ({
      ...prev,
      playerStats: [...prev.playerStats, emptyPS(prev.myClubSideId)],
    }));
  };

  const removeEditStatsRow = (idx) => {
    setEditStats((prev) => ({
      ...prev,
      playerStats: prev.playerStats.filter((_, i) => i !== idx),
    }));
  };

  const updateEditStatsRow = (idx, patch) => {
    setEditStats((prev) => ({
      ...prev,
      playerStats: prev.playerStats.map((row, i) =>
        i === idx ? { ...row, ...patch } : row
      ),
    }));
  };

  const validateEditStats = () => {
    if (!editStats.myClubSideId) {
      return "Tu club no participa en este partido.";
    }

    const cleanedMyStats = editStats.playerStats
      .map((ps) => ({
        user: ps.user,
        club: editStats.myClubSideId,
        goals: Number(ps.goals || 0),
        assists: Number(ps.assists || 0),
      }))
      .filter((ps) => ps.user);

    const seen = new Set();

    for (const ps of cleanedMyStats) {
      const key = `${ps.user}-${ps.club}`;

      if (seen.has(key)) {
        return "Hay jugadores duplicados en playerStats.";
      }
      seen.add(key);

      if (ps.goals < 0 || ps.assists < 0) {
        return "Goals/assists no pueden ser negativos.";
      }

      const maxGoals =
        ps.club === editStats.homeClub
          ? Number(editStats.scoreHome)
          : Number(editStats.scoreAway);

      if (ps.goals > maxGoals) {
        return "Goles del jugador exceden goles del club.";
      }

      if (ps.goals + ps.assists > maxGoals) {
        return "Goles + asistencias exceden goles del club.";
      }
    }

    const fullPayload = [
      ...cleanedMyStats,
      ...editStats.rivalPlayerStats.map((ps) => ({
        user: ps.user,
        club: ps.club,
        goals: Number(ps.goals || 0),
        assists: Number(ps.assists || 0),
      })),
    ];

    const totalHomeGoals = fullPayload
      .filter((ps) => String(ps.club) === String(editStats.homeClub))
      .reduce((acc, ps) => acc + Number(ps.goals || 0), 0);

    const totalAwayGoals = fullPayload
      .filter((ps) => String(ps.club) === String(editStats.awayClub))
      .reduce((acc, ps) => acc + Number(ps.goals || 0), 0);

    if (totalHomeGoals !== Number(editStats.scoreHome)) {
      return `HOME: la suma de goles (${totalHomeGoals}) no coincide con scoreHome (${editStats.scoreHome})`;
    }

    if (totalAwayGoals !== Number(editStats.scoreAway)) {
      return `AWAY: la suma de goles (${totalAwayGoals}) no coincide con scoreAway (${editStats.scoreAway})`;
    }

    return null;
  };

  const saveEditStats = async (e) => {
  e.preventDefault();
  setEditStatsErr("");
  setEditStatsOk("");

  const msg = validateEditStats();
  if (msg) {
    setEditStatsErr(msg);
    return;
  }

  if (!myClubId) {
    setEditStatsErr("No tienes club activo en sesión.");
    return;
  }

  const myStatsPayload = editStats.playerStats
    .map((ps) => ({
      user: ps.user,
      club: editStats.myClubSideId,
      goals: Number(ps.goals || 0),
      assists: Number(ps.assists || 0),
    }))
    .filter((ps) => ps.user);

  const rivalStatsPayload = editStats.rivalPlayerStats.map((ps) => ({
    user: ps.user,
    club: ps.club,
    goals: Number(ps.goals || 0),
    assists: Number(ps.assists || 0),
  }));

  const fullPayload = [...myStatsPayload, ...rivalStatsPayload];

  try {
    setEditStats((prev) => ({ ...prev, saving: true }));

    await api.patch(
      `/matches/${editStats.matchId}/clubs/${myClubId}/player-stats`,
      {
        strictTotals: true,
        playerStats: fullPayload,
      }
    );

    setEditStatsOk("✅ playerStats actualizados.");
    await loadMyMatches();
  } catch (e) {
    setEditStatsErr(e?.response?.data?.message || e.message);
  } finally {
    setEditStats((prev) => ({ ...prev, saving: false }));
  }
};
  // =========================
  // Eliminar partido
  // =========================
  const handleDeleteMatch = async (matchId) => {
  const confirmed = window.confirm("¿Seguro que quieres eliminar este partido?");
  if (!confirmed) return;

  if (!myClubId) {
    setMatchesErr("No tienes club activo en sesión.");
    return;
  }

  try {
    await api.delete(`/matches/${matchId}/clubs/${myClubId}`);
    await loadMyMatches();
  } catch (e) {
    setMatchesErr(e?.response?.data?.message || e.message);
  }
};
  // =========================
  // Resúmenes
  // =========================
  const totalGoalsAssigned = playerStats.reduce(
    (acc, ps) => acc + Number(ps.goals || 0),
    0
  );

  const totalAssistsAssigned = playerStats.reduce(
    (acc, ps) => acc + Number(ps.assists || 0),
    0
  );

  const totalMatchGoals = Number(scoreHome || 0) + Number(scoreAway || 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl p-6 bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
              Partidos
            </h1>
            <p className="mt-1 text-[var(--fifa-mute)]">
              Crea, edita y elimina partidos de tu club. También puedes gestionar playerStats.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full lg:w-[340px]">
            <MiniInfo label="Clubes" value={clubs.length} />
            <MiniInfo label="Miembros" value={myMembers.length} />
            <MiniInfo label="Partidos" value={matches.length} />
          </div>
        </div>

        <div className="mt-4 text-sm text-[var(--fifa-mute)]">
          Tu club activo:{" "}
          <span className="text-[var(--fifa-text)] font-semibold">
            {myClub?.name || "—"}
          </span>
        </div>

        {loadingBase ? (
          <div className="mt-4 text-sm text-[var(--fifa-mute)]">Cargando datos…</div>
        ) : null}

        {baseErr ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {baseErr}
          </div>
        ) : null}

        {!loadingBase && !baseErr && !myClubId ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            No tienes un club activo en sesión. No puedes registrar partidos con roster real.
          </div>
        ) : null}
      </section>

      {/* RESUMEN RÁPIDO */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Mi club" value={myClub?.name || "—"} />
        <StatCard
          label="Rival"
          value={
            myClubIsHome
              ? selectedAway?.name || "—"
              : myClubIsAway
              ? selectedHome?.name || "—"
              : "—"
          }
        />
        <StatCard label="Goles match" value={String(totalMatchGoals)} />
        <StatCard label="Stats cargadas" value={String(playerStats.length)} />
      </section>

      {/* FORM */}
      <section className="rounded-2xl p-6 bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
              CREAR PARTIDO
            </div>
            <div className="mt-1 text-sm text-[var(--fifa-mute)]">
              Tu club debe participar como local o visita.
            </div>
          </div>

          <button
            type="button"
            onClick={clearForm}
            className="rounded-xl px-4 py-2 bg-white/5 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] font-semibold hover:shadow-neon transition"
          >
            Limpiar formulario
          </button>
        </div>

        {formErr ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {formErr}
          </div>
        ) : null}

        {formOk ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-neon)]/30 p-3 text-sm text-[var(--fifa-neon)]">
            {formOk}
          </div>
        ) : null}

        <form onSubmit={onCreate} className="mt-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Home club">
              <select
                value={homeClub}
                onChange={(e) => setHomeClub(e.target.value)}
                className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
              >
                <option value="">Selecciona home</option>
                {clubOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Away club">
              <select
                value={awayClub}
                onChange={(e) => setAwayClub(e.target.value)}
                className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
              >
                <option value="">Selecciona away</option>
                {clubOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {!matchIncludesMyClub && homeClub && awayClub ? (
            <div className="rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
              Debes elegir un partido donde participe tu club para usar el roster real.
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Fecha">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
              />
            </Field>

            <Field label="Estadio">
              <input
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                placeholder="Estadio Nacional"
                className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
              />
            </Field>

            <Field label="Marcador">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={scoreHome}
                  onChange={(e) => setScoreHome(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                  placeholder="Home"
                />
                <input
                  type="number"
                  min="0"
                  value={scoreAway}
                  onChange={(e) => setScoreAway(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                  placeholder="Away"
                />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoPanel
              title="Goles asignados"
              value={totalGoalsAssigned}
              note={`Total partido: ${totalMatchGoals}`}
              accent="var(--fifa-neon)"
            />
            <InfoPanel
              title="Asistencias asignadas"
              value={totalAssistsAssigned}
              note="Solo para tu club"
              accent="var(--fifa-cyan)"
            />
            <InfoPanel
              title="Filas playerStats"
              value={playerStats.length}
              note="Roster real de tu club"
              accent="var(--fifa-mute)"
            />
          </div>

          <div className="rounded-2xl bg-black/25 ring-1 ring-[var(--fifa-line)] p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
                  PLAYER STATS
                </div>
                <div className="text-sm text-[var(--fifa-mute)]">
                  Solo se muestran miembros reales de tu club.
                </div>
              </div>

              <button
                type="button"
                onClick={addPS}
                disabled={!matchIncludesMyClub}
                className="rounded-xl px-4 py-2 bg-white/5 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] font-semibold hover:shadow-neon transition disabled:opacity-50"
              >
                + Agregar jugador
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {playerStats.map((ps, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-black/25 ring-1 ring-[var(--fifa-line)] p-3 grid grid-cols-1 lg:grid-cols-12 gap-3"
                >
                  <div className="lg:col-span-6">
                    <div className="text-xs text-[var(--fifa-mute)] mb-1">Jugador</div>
                    <select
                      value={ps.user}
                      onChange={(e) => updatePS(idx, { user: e.target.value })}
                      disabled={!matchIncludesMyClub}
                      className="w-full rounded-xl px-3 py-2 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] disabled:opacity-50"
                    >
                      <option value="">Selecciona jugador de tu club</option>
                      {myMembers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-[var(--fifa-mute)] mb-1">Club</div>
                    <input
                      value={
                        myClubSelectedSideId === homeClub
                          ? `Home: ${selectedHome?.name || "Home"}`
                          : myClubSelectedSideId === awayClub
                          ? `Away: ${selectedAway?.name || "Away"}`
                          : "—"
                      }
                      readOnly
                      className="w-full rounded-xl px-3 py-2 bg-black/20 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-mute)]"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-[var(--fifa-mute)] mb-1">Goles</div>
                    <input
                      type="number"
                      min="0"
                      value={ps.goals}
                      onChange={(e) => updatePS(idx, { goals: e.target.value })}
                      disabled={!matchIncludesMyClub}
                      className="w-full rounded-xl px-3 py-2 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] disabled:opacity-50"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-[var(--fifa-mute)] mb-1">Asist</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={ps.assists}
                        onChange={(e) => updatePS(idx, { assists: e.target.value })}
                        disabled={!matchIncludesMyClub}
                        className="w-full rounded-xl px-3 py-2 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => removePS(idx)}
                        disabled={playerStats.length === 1}
                        className="rounded-xl px-3 py-2 bg-black/20 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-mute)] hover:text-[var(--fifa-text)] disabled:opacity-40"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-[var(--fifa-mute)]">
              Con tu backend actual, el roster real disponible es el de tu propio club.
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl px-4 py-3 bg-fifa-blue text-white font-extrabold tracking-wide hover:opacity-90 disabled:opacity-60 shadow-neon transition"
          >
            {saving ? "Guardando..." : "Crear partido"}
          </button>
        </form>
      </section>

      {/* MIS PARTIDOS */}
      <section className="rounded-2xl p-6 bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
              MIS PARTIDOS
            </div>
            <div className="mt-1 text-sm text-[var(--fifa-mute)]">
              Gestión completa de partidos de tu club.
            </div>
          </div>

          <button
            type="button"
            onClick={loadMyMatches}
            className="rounded-xl px-4 py-2 bg-white/5 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] font-semibold hover:shadow-neon transition"
          >
            Recargar
          </button>
        </div>

        {matchesErr ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {matchesErr}
          </div>
        ) : null}

        {matchesLoading ? (
          <div className="mt-4 text-sm text-[var(--fifa-mute)]">Cargando partidos…</div>
        ) : null}

        {!matchesLoading && matches.length === 0 ? (
          <div className="mt-4 rounded-xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-4 text-sm text-[var(--fifa-mute)]">
            Aún no hay partidos registrados para tu club.
          </div>
        ) : null}

        {!matchesLoading && matches.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {matches.map((match) => {
              const homeId = match?.homeClub?._id || "";
              const awayId = match?.awayClub?._id || "";
              const homeName = match?.homeClub?.name || "Home";
              const awayName = match?.awayClub?.name || "Away";

              const isHome = String(homeId) === String(myClubId);
              const myGoals = isHome
                ? Number(match?.scoreHome ?? 0)
                : Number(match?.scoreAway ?? 0);
              const rivalGoals = isHome
                ? Number(match?.scoreAway ?? 0)
                : Number(match?.scoreHome ?? 0);

              let resultLabel = "EMPATE";
              let resultAccent = "var(--fifa-cyan)";

              if (myGoals > rivalGoals) {
                resultLabel = "VICTORIA";
                resultAccent = "var(--fifa-neon)";
              } else if (myGoals < rivalGoals) {
                resultLabel = "DERROTA";
                resultAccent = "var(--fifa-danger)";
              }

              return (
                <article
                  key={match._id}
                  className="rounded-2xl bg-black/25 ring-1 ring-[var(--fifa-line)] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-xs text-[var(--fifa-mute)]">
                          {match?.date ? new Date(match.date).toLocaleDateString() : "—"}
                        </div>
                        <div
                          className="text-[10px] font-extrabold tracking-widest"
                          style={{ color: resultAccent }}
                        >
                          {resultLabel}
                        </div>
                      </div>

                      <div className="mt-2 text-lg font-extrabold text-[var(--fifa-text)]">
                        {homeName} <span className="text-[var(--fifa-mute)]">vs</span> {awayName}
                      </div>

                      <div className="mt-2 text-2xl font-extrabold text-[var(--fifa-text)]">
                        {match?.scoreHome ?? 0} - {match?.scoreAway ?? 0}
                      </div>

                      <div className="mt-2 text-sm text-[var(--fifa-mute)]">
                        {match?.stadium || "Sin estadio"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditMatch(match)}
                        className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-cyan)]/30 transition"
                      >
                        Editar partido
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditStats(match)}
                        className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 transition"
                      >
                        Editar playerStats
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMatch(match._id)}
                        className="rounded-lg bg-black/20 px-3 py-2 text-sm font-semibold text-[var(--fifa-danger)] ring-1 ring-[var(--fifa-danger)]/30 hover:bg-[rgba(255,77,109,0.08)] transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* MODAL EDITAR PARTIDO */}
      {editMatch.open ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto mt-8 rounded-2xl p-6 bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
                  EDITAR PARTIDO
                </div>
                <div className="mt-1 text-sm text-[var(--fifa-mute)]">
                  Actualiza datos básicos del encuentro.
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditMatch}
                className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)]"
              >
                Cerrar
              </button>
            </div>

            {editMatchErr ? (
              <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
                {editMatchErr}
              </div>
            ) : null}

            {editMatchOk ? (
              <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-neon)]/30 p-3 text-sm text-[var(--fifa-neon)]">
                {editMatchOk}
              </div>
            ) : null}

            <form onSubmit={saveEditMatch} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Home club">
                  <select
                    value={editMatch.homeClub}
                    onChange={(e) =>
                      setEditMatch((prev) => ({ ...prev, homeClub: e.target.value }))
                    }
                    className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                  >
                    <option value="">Selecciona home</option>
                    {clubOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Away club">
                  <select
                    value={editMatch.awayClub}
                    onChange={(e) =>
                      setEditMatch((prev) => ({ ...prev, awayClub: e.target.value }))
                    }
                    className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                  >
                    <option value="">Selecciona away</option>
                    {clubOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Fecha">
                  <input
                    type="date"
                    value={editMatch.date}
                    onChange={(e) =>
                      setEditMatch((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                  />
                </Field>

                <Field label="Estadio">
                  <input
                    value={editMatch.stadium}
                    onChange={(e) =>
                      setEditMatch((prev) => ({ ...prev, stadium: e.target.value }))
                    }
                    className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                  />
                </Field>

                <Field label="Marcador">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editMatch.scoreHome}
                      onChange={(e) =>
                        setEditMatch((prev) => ({
                          ...prev,
                          scoreHome: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                    />
                    <input
                      type="number"
                      min="0"
                      value={editMatch.scoreAway}
                      onChange={(e) =>
                        setEditMatch((prev) => ({
                          ...prev,
                          scoreAway: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl px-3 py-3 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                    />
                  </div>
                </Field>
              </div>

              <button
                type="submit"
                disabled={editMatch.saving}
                className="w-full rounded-2xl px-4 py-3 bg-fifa-blue text-white font-extrabold tracking-wide hover:opacity-90 disabled:opacity-60 shadow-neon transition"
              >
                {editMatch.saving ? "Guardando..." : "Guardar cambios del partido"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* MODAL EDITAR PLAYER STATS */}
      {editStats.open ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto mt-8 rounded-2xl p-6 bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
                  EDITAR PLAYER STATS
                </div>
                <div className="mt-1 text-sm text-[var(--fifa-mute)]">
                  Se conservan los stats del rival y solo editas los de tu club.
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditStats}
                className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)]"
              >
                Cerrar
              </button>
            </div>

            {editStatsErr ? (
              <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
                {editStatsErr}
              </div>
            ) : null}

            {editStatsOk ? (
              <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-neon)]/30 p-3 text-sm text-[var(--fifa-neon)]">
                {editStatsOk}
              </div>
            ) : null}

            <form onSubmit={saveEditStats} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <InfoPanel
                  title="Score Home"
                  value={editStats.scoreHome}
                  note={clubMap[editStats.homeClub]?.name || "Home"}
                  accent="var(--fifa-cyan)"
                />
                <InfoPanel
                  title="Score Away"
                  value={editStats.scoreAway}
                  note={clubMap[editStats.awayClub]?.name || "Away"}
                  accent="var(--fifa-cyan)"
                />
                <InfoPanel
                  title="Mis filas"
                  value={editStats.playerStats.length}
                  note="Tu club"
                  accent="var(--fifa-neon)"
                />
                <InfoPanel
                  title="Filas rival"
                  value={editStats.rivalPlayerStats.length}
                  note="Se conservan"
                  accent="var(--fifa-mute)"
                />
              </div>

              <div className="rounded-2xl bg-black/25 ring-1 ring-[var(--fifa-line)] p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
                      PLAYER STATS DE TU CLUB
                    </div>
                    <div className="text-sm text-[var(--fifa-mute)]">
                      El rival no se toca, pero sí se enviará completo al backend.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addEditStatsRow}
                    className="rounded-xl px-4 py-2 bg-white/5 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] font-semibold hover:shadow-neon transition"
                  >
                    + Agregar jugador
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {editStats.playerStats.map((ps, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-black/25 ring-1 ring-[var(--fifa-line)] p-3 grid grid-cols-1 lg:grid-cols-12 gap-3"
                    >
                      <div className="lg:col-span-6">
                        <div className="text-xs text-[var(--fifa-mute)] mb-1">Jugador</div>
                        <select
                          value={ps.user}
                          onChange={(e) =>
                            updateEditStatsRow(idx, {
                              user: e.target.value,
                              club: editStats.myClubSideId,
                            })
                          }
                          className="w-full rounded-xl px-3 py-2 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                        >
                          <option value="">Selecciona jugador</option>
                          {myMembers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <div className="text-xs text-[var(--fifa-mute)] mb-1">Club</div>
                        <input
                          readOnly
                          value={
                            editStats.myClubSideId === editStats.homeClub
                              ? `Home: ${clubMap[editStats.homeClub]?.name || "Home"}`
                              : editStats.myClubSideId === editStats.awayClub
                              ? `Away: ${clubMap[editStats.awayClub]?.name || "Away"}`
                              : "—"
                          }
                          className="w-full rounded-xl px-3 py-2 bg-black/20 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-mute)]"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <div className="text-xs text-[var(--fifa-mute)] mb-1">Goles</div>
                        <input
                          type="number"
                          min="0"
                          value={ps.goals}
                          onChange={(e) =>
                            updateEditStatsRow(idx, { goals: e.target.value })
                          }
                          className="w-full rounded-xl px-3 py-2 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <div className="text-xs text-[var(--fifa-mute)] mb-1">Asist</div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={ps.assists}
                            onChange={(e) =>
                              updateEditStatsRow(idx, { assists: e.target.value })
                            }
                            className="w-full rounded-xl px-3 py-2 bg-black/30 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)]"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditStatsRow(idx)}
                            disabled={editStats.playerStats.length === 1}
                            className="rounded-xl px-3 py-2 bg-black/20 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-mute)] hover:text-[var(--fifa-text)] disabled:opacity-40"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {editStats.rivalPlayerStats.length > 0 ? (
                  <div className="mt-4 rounded-xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-4">
                    <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
                      STATS DEL RIVAL CONSERVADOS
                    </div>

                    <div className="mt-3 space-y-2">
                      {editStats.rivalPlayerStats.map((ps, idx) => {
                        const clubName = clubMap[ps.club]?.name || "Club";
                        return (
                          <div
                            key={`${ps.user}-${ps.club}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"
                          >
                            <div className="text-sm text-[var(--fifa-text)] truncate">
                              Jugador ID: {ps.user}
                            </div>

                            <div className="text-xs text-[var(--fifa-mute)]">
                              {clubName} · G: {ps.goals} · A: {ps.assists}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={editStats.saving}
                className="w-full rounded-2xl px-4 py-3 bg-fifa-blue text-white font-extrabold tracking-wide hover:opacity-90 disabled:opacity-60 shadow-neon transition"
              >
                {editStats.saving ? "Guardando..." : "Guardar playerStats"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--fifa-mute)] mb-2">{label}</div>
      {children}
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-[var(--fifa-text)] truncate">
        {value}
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-xl bg-black/25 p-3 ring-1 ring-[var(--fifa-line)]">
      <div className="text-[10px] tracking-widest text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-[var(--fifa-text)]">{value}</div>
    </div>
  );
}

function InfoPanel({ title, value, note, accent }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{title}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--fifa-mute)]">{note}</div>
    </div>
  );
}