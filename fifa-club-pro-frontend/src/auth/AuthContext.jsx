// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me as apiMe } from "../api/auth";
import { registerLogoutHandler } from "./sessionManager";

/**
 * =====================================================
 * AUTH CONTEXT
 * -----------------------------------------------------
 * Responsabilidades:
 * - persistir token, user y clubContext
 * - restaurar sesión al refrescar
 * - exponer helpers de login/logout
 * - reconstruir clubContext desde /auth/me si hace falta
 *
 * Contrato público esperado por el resto de la app:
 * - token
 * - user
 * - clubContext { clubId, role } | null
 * - booting
 * - isLoggedIn
 * - setSessionFromLogin(...)
 * - setClubContext(...)
 * - clearClubContext()
 * - bootstrapClubContext()
 * - logout()
 * =====================================================
 */

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Parseo seguro para localStorage
 */
function safeParseJSON(rawValue) {
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [clubContext, setClubContextState] = useState(null);
  const [booting, setBooting] = useState(true);

  const isLoggedIn = Boolean(token);

  /**
   * -----------------------------------------------------
   * Boot inicial desde localStorage
   * -----------------------------------------------------
   */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedClubContext = localStorage.getItem("clubContext");

    if (storedToken) {
      setToken(storedToken);
    }

    const parsedUser = safeParseJSON(storedUser);
    if (parsedUser) {
      setUser(parsedUser);
    } else if (storedUser) {
      localStorage.removeItem("user");
    }

    const parsedClubContext = safeParseJSON(storedClubContext);
    if (parsedClubContext?.clubId) {
      setClubContextState(parsedClubContext);
    } else if (storedClubContext) {
      localStorage.removeItem("clubContext");
    }

    setBooting(false);
  }, []);

  /**
   * -----------------------------------------------------
   * Persiste el contexto de club de forma segura
   * -----------------------------------------------------
   */
  const setClubContextSafe = (ctx) => {
    if (ctx?.clubId) {
      setClubContextState(ctx);
      localStorage.setItem("clubContext", JSON.stringify(ctx));
      return;
    }

    setClubContextState(null);
    localStorage.removeItem("clubContext");
  };

  /**
   * -----------------------------------------------------
   * Guarda sesión después de login/register
   * -----------------------------------------------------
   * Acepta:
   * {
   *   token,
   *   user,
   *   clubContext? // opcional
   * }
   * -----------------------------------------------------
   */
  const setSessionFromLogin = ({
    token: nextToken,
    user: nextUser,
    clubContext: nextClubContext,
  }) => {
    // token
    if (nextToken) {
      setToken(nextToken);
      localStorage.setItem("token", nextToken);
    } else {
      setToken(null);
      localStorage.removeItem("token");
    }

    // user
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      setUser(null);
      localStorage.removeItem("user");
    }

    // clubContext
    setClubContextSafe(nextClubContext || null);
  };

  /**
   * -----------------------------------------------------
   * Limpia solo el contexto de club
   * -----------------------------------------------------
   */
  const clearClubContext = () => {
    setClubContextSafe(null);
  };

  /**
   * -----------------------------------------------------
   * Reconstruye clubContext desde /auth/me
   * -----------------------------------------------------
   * Prioridad:
   * 1) data.clubContext
   * 2) primera membership si existe
   * 3) null
   *
   * Devuelve:
   * - { clubId, role } si pudo resolverlo
   * - null si no hay contexto de club
   * -----------------------------------------------------
   */
  const bootstrapClubContext = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return null;

    try {
      const data = await apiMe();

      if (data?.clubContext?.clubId) {
        setClubContextSafe(data.clubContext);
        return data.clubContext;
      }

      if (Array.isArray(data?.memberships) && data.memberships.length > 0) {
        const firstMembership = data.memberships[0];

        if (firstMembership?.clubId && firstMembership?.role) {
          const fallbackContext = {
            clubId: firstMembership.clubId,
            role: firstMembership.role,
          };

          setClubContextSafe(fallbackContext);
          return fallbackContext;
        }
      }

      setClubContextSafe(null);
      return null;
    } catch {
      setClubContextSafe(null);
      return null;
    }
  };

  /**
   * -----------------------------------------------------
   * Logout total
   * -----------------------------------------------------
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    setClubContextState(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("clubContext");

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  };

  /**
   * -----------------------------------------------------
   * Registra logout global
   * -----------------------------------------------------
   * Esto permite que api/client.js dispare el logout
   * cuando llega un 401 fuera de login/register.
   * -----------------------------------------------------
   */
  useEffect(() => {
    registerLogoutHandler(logout);
  }, []);

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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}