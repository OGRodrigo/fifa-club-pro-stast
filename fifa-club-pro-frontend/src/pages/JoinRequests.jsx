import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { useToast } from "../ui/ToastContext";

export default function JoinRequests() {
  const { clubContext } = useAuth();
  const toast = useToast();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";
  const isAdminOrCaptain = role === "admin" || role === "captain";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [requests, setRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState("");

  async function loadRequests() {
    if (!clubId) {
      setRequests([]);
      setErr("");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await api.get(`/clubs/${clubId}/join-requests`);
      setRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
    } catch (e) {
      setRequests([]);
      setErr(
        e?.response?.data?.message || e.message || "Error cargando solicitudes"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clubId) {
      setRequests([]);
      setErr("");
      return;
    }

    loadRequests();
  }, [clubId]);

  async function resolveRequest(userId, action) {
    if (!clubId || !userId) return;

    try {
      setActionLoading(userId);
      setErr("");

      await api.put(`/clubs/${clubId}/join-requests/${userId}`, { action });

      toast.success(
        action === "accept"
          ? "Solicitud aceptada correctamente."
          : "Solicitud rechazada correctamente."
      );

      await loadRequests();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e.message ||
        "Error resolviendo solicitud";

      setErr(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  if (!clubId) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)]">
          <h1 className="text-2xl font-bold text-fifa-text">
            Solicitudes de ingreso
          </h1>
          <p className="mt-2 text-fifa-mute">
            No tienes un club activo seleccionado.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdminOrCaptain) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)]">
          <h1 className="text-2xl font-bold text-fifa-text">
            Solicitudes de ingreso
          </h1>
          <p className="mt-2 text-fifa-mute">
            No autorizado. Solo <b>admin</b> o <b>captain</b> pueden revisar
            solicitudes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl bg-fifa-card p-5 shadow-glow ring-1 ring-[var(--fifa-line)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-fifa-text">
              Solicitudes de ingreso
            </h1>

            <p className="mt-2 text-fifa-mute">
              Aquí puedes aprobar o rechazar usuarios que quieren unirse al
              club.
            </p>

            <div className="mt-3 text-sm text-fifa-mute">
              Club: <b>{clubId}</b> · Rol: <b>{role}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-fifa-text ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Recargar"}
          </button>
        </div>
      </section>

      {err ? (
        <div className="rounded-xl bg-black/30 p-4 text-fifa-danger ring-1 ring-[var(--fifa-danger)]">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl bg-fifa-card shadow-glow ring-1 ring-[var(--fifa-line)]">
        <div className="border-b border-[var(--fifa-line)] px-5 py-4">
          <div className="text-xs tracking-widest text-fifa-mute">
            PENDIENTES ({requests.length})
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-fifa-mute">Cargando solicitudes...</div>
          ) : null}

          {!loading && requests.length === 0 ? (
            <div className="rounded-xl bg-black/20 p-4 text-fifa-mute ring-1 ring-[var(--fifa-line)]">
              No hay solicitudes pendientes por revisar.
            </div>
          ) : null}

          <div className="space-y-3">
            {requests.map((r, idx) => {
              const user = r?.user || {};
              const userId = user?._id || "";
              const cardKey = userId || r?._id || `join-request-${idx}`;
              const isBusy = actionLoading === userId;

              return (
                <div
                  key={cardKey}
                  className="flex flex-col gap-4 rounded-xl bg-black/20 p-4 ring-1 ring-[var(--fifa-line)] md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-semibold text-fifa-text">
                      {user.gamerTag || user.username || "Usuario"}
                    </div>

                    <div className="text-sm text-fifa-mute">
                      @{user.username || "sin-username"} ·{" "}
                      {user.platform || "—"} · {user.country || "—"}
                    </div>

                    <div className="mt-1 text-xs text-fifa-mute">
                      Solicitud enviada:{" "}
                      {r?.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isBusy || !userId}
                      onClick={() => resolveRequest(userId, "accept")}
                      className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-400 ring-1 ring-green-400/30 hover:bg-green-500/30 disabled:opacity-60"
                    >
                      {isBusy ? "Procesando..." : "Aceptar"}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy || !userId}
                      onClick={() => resolveRequest(userId, "reject")}
                      className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 ring-1 ring-red-400/30 hover:bg-red-500/30 disabled:opacity-60"
                    >
                      {isBusy ? "Procesando..." : "Rechazar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}