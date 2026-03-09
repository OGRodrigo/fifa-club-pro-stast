import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me as apiMe } from "../api/auth";
import { registerLogoutHandler } from "./sessionManager";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [clubContext, setClubContext] = useState(null);
  const [booting, setBooting] = useState(true);

  const isLoggedIn = Boolean(token);

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

    setBooting(false);
  }, []);

  const setSessionFromLogin = ({ token: t, user: u, clubContext: ctx }) => {
    setToken(t || null);
    setUser(u || null);

    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");

    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");

    if (ctx?.clubId) {
      setClubContext(ctx);
      localStorage.setItem("clubContext", JSON.stringify(ctx));
    } else {
      setClubContext(null);
      localStorage.removeItem("clubContext");
    }
  };

  const setClubContextSafe = (ctx) => {
    setClubContext(ctx || null);

    if (ctx?.clubId) {
      localStorage.setItem("clubContext", JSON.stringify(ctx));
    } else {
      localStorage.removeItem("clubContext");
    }
  };

  const clearClubContext = () => setClubContextSafe(null);

  const bootstrapClubContext = async () => {
    if (!localStorage.getItem("token")) return null;

    try {
      const data = await apiMe();

      if (data?.clubContext?.clubId) {
        setClubContextSafe(data.clubContext);
        return data.clubContext;
      }

      if (Array.isArray(data?.memberships) && data.memberships.length > 0) {
        const first = data.memberships[0];

        if (first?.clubId && first?.role) {
          const ctx = { clubId: first.clubId, role: first.role };
          setClubContextSafe(ctx);
          return ctx;
        }
      }

      setClubContextSafe(null);
      return null;
    } catch {
      setClubContextSafe(null);
      return null;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setClubContext(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("clubContext");

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  };

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}