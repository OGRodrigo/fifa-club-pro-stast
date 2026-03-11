// src/layout/MainLayout.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMemo, useState } from "react";

const linkBase =
  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition";
const linkIdle =
  "text-[var(--fifa-mute)] hover:text-[var(--fifa-text)] hover:bg-white/5";
const linkActive =
  "text-[var(--fifa-text)] bg-white/5 ring-1 ring-[var(--fifa-neon)]/20 shadow-glow";

export default function MainLayout({ children }) {
  const { user, logout, clubContext } = useAuth();
  const [copied, setCopied] = useState(false);

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdmin = role === "admin";
  const isCaptain = role === "captain";
  const isAdminOrCaptain = useMemo(
    () => isAdmin || isCaptain,
    [isAdmin, isCaptain]
  );

  const hasClub = Boolean(clubId);
  const canCopyId = hasClub && isAdminOrCaptain;

  const copyClubId = async () => {
    if (!clubId) return;

    try {
      await navigator.clipboard.writeText(clubId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error("Clipboard error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-fifa-radial">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-[var(--fifa-line)]/70 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-[var(--fifa-neon)]/25 shadow-glow">
              <span className="text-sm">⚽</span>
            </div>

            <div>
              <div className="text-lg font-extrabold tracking-tight">
                FIFA Club Pro
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fifa-mute)]">
                <span>
                  clubId:{" "}
                  <span className="text-[var(--fifa-text)]">{clubId || "—"}</span>
                  {" "}· rol:{" "}
                  <span className="text-[var(--fifa-text)]">{role || "—"}</span>
                </span>

                {canCopyId && (
                  <button
                    onClick={copyClubId}
                    type="button"
                    className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-semibold ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
                  >
                    {copied ? "Copiado ✅" : "Copiar ID"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-[var(--fifa-mute)]">
              {user?.username ?? "usuario"}
            </div>

            <button
              onClick={logout}
              className="rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-5 px-5 py-6">
        <aside className="col-span-12 md:col-span-3 xl:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow">
            <div className="border-b border-[var(--fifa-line)]/70 px-4 py-4">
              <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
                NAVEGACIÓN
              </div>
            </div>

            <div className="px-3 py-3">
              <nav className="space-y-2">
                {/* GENERAL */}
                <MenuSection title="General" />
                <MenuLink to="/home" label="Inicio" icon="🏠" />
                <MenuLink to="/league" label="Liga" icon="🏆" />

                {/* SIN CLUB */}
                {!hasClub && (
                  <>
                    <MenuSection title="Club" />
                    <MenuLink to="/clubs/create" label="Crear club" icon="➕" />
                    <MenuLink to="/clubs" label="Unirse a club" icon="🤝" />
                  </>
                )}

                {/* CON CLUB */}
                {hasClub && (
                  <>
                    <MenuSection title="Club activo" />
                    <MenuLink to="/matches" label="Partidos" icon="⚽" />
                  </>
                )}

                {/* ADMIN / CAPTAIN */}
                {hasClub && isAdminOrCaptain && (
                  <>
                    <MenuSection title="Gestión" />
                    <MenuLink
                      to="/clubs/join-requests"
                      label="Solicitudes"
                      icon="📩"
                    />
                    <MenuLink
                      to="/club/members-stats"
                      label="Miembros"
                      icon="📊"
                    />
                    <MenuLink
                      to="/club/analytics"
                      label="Club Analytics"
                      icon="📈"
                    />
                  </>
                )}
              </nav>
            </div>

            <div className="border-t border-[var(--fifa-line)]/80 px-4 py-4">
              <div className="rounded-xl bg-black/30 p-3 ring-1 ring-[var(--fifa-line)]">
                <div className="text-xs text-[var(--fifa-mute)]">Estado actual</div>
                <div className="mt-1 text-sm text-[var(--fifa-text)]">
                  {hasClub ? (
                    <>
                      Estás operando dentro de un club con rol{" "}
                      <span className="font-semibold text-[var(--fifa-neon)]">
                        {role}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Aún no tienes un club activo. Puedes{" "}
                      <span className="font-semibold text-[var(--fifa-neon)]">
                        crear
                      </span>{" "}
                      uno o{" "}
                      <span className="font-semibold text-[var(--fifa-neon)]">
                        unirte
                      </span>{" "}
                      a uno existente.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 min-w-0 md:col-span-9 xl:col-span-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function MenuSection({ title }) {
  return (
    <div className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--fifa-mute)]/80">
      {title}
    </div>
  );
}

function MenuLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${linkBase} ${isActive ? linkActive : linkIdle}`
      }
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}