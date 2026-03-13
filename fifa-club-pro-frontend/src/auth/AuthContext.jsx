// src/auth/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { me as apiMe } from "../api/auth";
import { registerLogoutHandler } from "./sessionManager";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }

  return ctx;
}

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

  const clearStorage = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("clubContext");
  }, []);

  const setClubContextSafe = useCallback((ctx) => {
    if (ctx?.clubId) {
      setClubContextState(ctx);
      localStorage.setItem("clubContext", JSON.stringify(ctx));
      return;
    }

    setClubContextState(null);
    localStorage.removeItem("clubContext");
  }, []);

  const clearClubContext = useCallback(() => {
    setClubContextSafe(null);
  }, [setClubContextSafe]);

  const setSessionFromLogin = useCallback(
    ({ token: nextToken, user: nextUser, clubContext: nextClubContext }) => {
      if (nextToken) {
        setToken(nextToken);
        localStorage.setItem("token", nextToken);
      } else {
        setToken(null);
        localStorage.removeItem("token");
      }

      if (nextUser) {
        setUser(nextUser);
        localStorage.setItem("user", JSON.stringify(nextUser));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }

      setClubContextSafe(nextClubContext || null);
    },
    [setClubContextSafe]
  );

  const bootstrapClubContext = useCallback(async () => {
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
  }, [setClubContextSafe]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setClubContextState(null);
    clearStorage();

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, [clearStorage]);

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

  useEffect(() => {
    registerLogoutHandler(logout);

    return () => {
      registerLogoutHandler(null);
    };
  }, [logout]);

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
    [
      token,
      user,
      clubContext,
      booting,
      isLoggedIn,
      setSessionFromLogin,
      setClubContextSafe,
      clearClubContext,
      bootstrapClubContext,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}