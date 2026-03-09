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
    if (!clubId) return;

    setLoading(true);
    setErr("");

    try {
      const res = await api.get(`/clubs/${clubId}/join-requests`);
      setRequests(res.data?.joinRequests || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clubId) return;
    loadRequests();
  }, [clubId]);

  async function resolveRequest(userId, action) {
    try {
      setActionLoading(userId);

      await api.put(`/clubs/${clubId}/join-requests/${userId}`, {
        action,
      });

      toast.success(
        action === "approve"
          ? "Solicitud aprobada correctamente."
          : "Solicitud rechazada correctamente."
      );

      await loadRequests();
    } catch (e) {
      const message =
        e?.response?.data?.message || e.message || "Error resolviendo solicitud";
      setErr(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  if (!isAdminOrCaptain) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-fifa-card p-5 ring-1 ring-[var(--fifa-line)]">
          <h1 className="text-2xl font-bold text-fifa-text">
            Solicitudes de ingreso
          </h1>

          <p className="mt-2 text-fifa-mute">
            No autorizado. Solo <b>admin</b> o <b>captain</b> pueden revisar solicitudes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <h1 className="text-3xl font-extrabold text-fifa-text">
          Solicitudes de ingreso
        </h1>

        <p className="mt-2 text-fifa-mute">
          Usuarios que quieren unirse al club.
        </p>

        <div className="mt-2 text-sm text-fifa-mute">
          Club: <b>{clubId}</b> · Rol: <b>{role}</b>
        </div>
      </section>

      {err && (
        <div className="rounded-xl bg-black/30 p-4 ring-1 ring-[var(--fifa-danger)] text-fifa-danger">
          {err}
        </div>
      )}

      <section className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow">
        <div className="px-5 py-4 border-b border-[var(--fifa-line)]">
          <div className="text-xs tracking-widest text-fifa-mute">
            PENDIENTES ({requests.length})
          </div>
        </div>

        <div className="p-5">
          {loading && <div className="text-fifa-mute">Cargando solicitudes...</div>}

          {!loading && requests.length === 0 && (
            <div className="text-fifa-mute">
              No hay solicitudes pendientes.
            </div>
          )}

          <div className="space-y-3">
            {requests.map((r) => {
              const user = r.user || {};
              const userId = user._id;

              return (
                <div
                  key={userId}
                  className="flex items-center justify-between rounded-xl bg-black/20 p-4 ring-1 ring-[var(--fifa-line)]"
                >
                  <div>
                    <div className="font-semibold text-fifa-text">
                      {user.gamerTag || user.username}
                    </div>

                    <div className="text-sm text-fifa-mute">
                      @{user.username} · {user.platform} · {user.country}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading === userId}
                      onClick={() => resolveRequest(userId, "approve")}
                      className="rounded-lg px-4 py-2 text-sm font-semibold bg-green-500/20 text-green-400 ring-1 ring-green-400/30 hover:bg-green-500/30"
                    >
                      Aprobar
                    </button>

                    <button
                      disabled={actionLoading === userId}
                      onClick={() => resolveRequest(userId, "reject")}
                      className="rounded-lg px-4 py-2 text-sm font-semibold bg-red-500/20 text-red-400 ring-1 ring-red-400/30 hover:bg-red-500/30"
                    >
                      Rechazar
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