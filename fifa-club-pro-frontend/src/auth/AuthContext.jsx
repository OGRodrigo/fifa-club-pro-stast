// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me as apiMe } from "../api/auth";

/**
 * AuthContext guarda:
 * - token
 * - user
 * - clubContext (clubId + role)
 *
 * Regla de oro:
 * - token existe => sesión
 * - clubContext existe => usuario está "en un club" (activo)
 */
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // ===== Estado principal =====
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // { clubId: string, role: "admin" | "captain" | "member" }
  const [clubContext, setClubContext] = useState(null);

  // Estado auxiliar: evita que la app parpadee antes de hidratar
  const [booting, setBooting] = useState(true);

  // Derivado: sesión activa
  const isLoggedIn = Boolean(token);

  /**
   * 1) Hydrate desde localStorage (al cargar la app)
   * - Esto mantiene sesión tras refresh
   */
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    const c = localStorage.getItem("clubContext");

    if (t) setToken(t);

    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        localStorage.removeItem("user");
      }
    }

    if (c) {
      try {
        setClubContext(JSON.parse(c));
      } catch {
        localStorage.removeItem("clubContext");
      }
    }

    setBooting(false); // ya hidratamos
  }, []);

  /**
   * 2) Guardar sesión desde login
   * - token + user siempre
   * - clubContext puede venir o no
   */
  const setSessionFromLogin = ({ token: t, user: u, clubContext: ctx }) => {
    setToken(t || null);
    setUser(u || null);

    // Persist token
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");

    // Persist user
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");

    // Persist clubContext (si viene, guardamos; si no, limpiamos)
    if (ctx?.clubId) {
      setClubContext(ctx);
      localStorage.setItem("clubContext", JSON.stringify(ctx));
    } else {
      setClubContext(null);
      localStorage.removeItem("clubContext");
    }
  };

  /**
   * 3) Set clubContext manual (cuando creas club / seleccionas club / te aceptan)
   */
  const setClubContextSafe = (ctx) => {
    setClubContext(ctx || null);
    if (ctx?.clubId) localStorage.setItem("clubContext", JSON.stringify(ctx));
    else localStorage.removeItem("clubContext");
  };

  const clearClubContext = () => setClubContextSafe(null);

  /**
   * 4) Bootstrap clubContext desde backend
   * - Se llama DESPUÉS del login si el backend no entregó clubContext
   * - También sirve al cargar app si tienes token pero no clubContext
   *
   * ✅ Esto cumple: "el código debe saber si pertenece a algún club y rol"
   * ⚠️ Requiere que exista GET /auth/me (o equivalente)
   */
  const bootstrapClubContext = async () => {
    // Si no hay token, no hacemos nada
    if (!localStorage.getItem("token")) return null;

    try {
      const data = await apiMe();

      // Caso A: backend manda clubContext directo
      if (data?.clubContext?.clubId) {
        setClubContextSafe(data.clubContext);
        return data.clubContext;
      }

      // Caso B: backend manda memberships => elegimos el primero (o “activo” si lo implementas)
      if (Array.isArray(data?.memberships) && data.memberships.length > 0) {
        const first = data.memberships[0];
        if (first?.clubId && first?.role) {
          const ctx = { clubId: first.clubId, role: first.role };
          setClubContextSafe(ctx);
          return ctx;
        }
      }

      // Caso C: no tiene club => clubContext null
      setClubContextSafe(null);
      return null;
    } catch {
      // Si falla /auth/me:
      // - No rompemos la app
      // - Simplemente quedamos en modo "sin club"
      setClubContextSafe(null);
      return null;
    }
  };

  /**
   * 5) Logout: limpia todo (memoria + storage)
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    setClubContext(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("clubContext");
  };

  // Value del contexto
  const value = useMemo(
    () => ({
      token,
      user,
      clubContext,
      booting,
      isLoggedIn,

      setSessionFromLogin,
      setClubContext: setClubContextSafe,
      clearClubContext,
      bootstrapClubContext,
      logout,
    }),
    [token, user, clubContext, booting, isLoggedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
