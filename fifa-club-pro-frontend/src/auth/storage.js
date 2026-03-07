// src/auth/storage.js
// Este archivo queda alineado al sistema real del proyecto:
// token / user / clubContext
// (NO más fcp_auth_v1, porque eso te mezcló sesiones)

export function loadAuth() {
  try {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    const ctxRaw = localStorage.getItem("clubContext");

    const user = userRaw ? JSON.parse(userRaw) : null;
    const clubContext = ctxRaw ? JSON.parse(ctxRaw) : null;

    return { token: token || null, user, clubContext };
  } catch {
    return { token: null, user: null, clubContext: null };
  }
}

export function saveAuth({ token, user, clubContext }) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");

  if (user) localStorage.setItem("user", JSON.stringify(user));
  else localStorage.removeItem("user");

  if (clubContext) localStorage.setItem("clubContext", JSON.stringify(clubContext));
  else localStorage.removeItem("clubContext");
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("clubContext");

  // Limpieza de legado (para que no vuelva a mezclar)
  localStorage.removeItem("fcp_auth_v1");
}
