// src/auth/sessionManager.js

/**
 * Logout handler global.
 * Lo registra AuthContext y lo puede invocar
 * cualquier capa compartida, por ejemplo el cliente HTTP.
 */
let logoutHandler = null;

/**
 * Registra la función real de logout.
 */
export function registerLogoutHandler(handler) {
  logoutHandler = handler;
}

/**
 * Ejecuta logout global.
 * Si no hay handler registrado aún, hace fallback seguro:
 * limpia storage y redirige a /login.
 */
export function runGlobalLogout() {
  if (typeof logoutHandler === "function") {
    logoutHandler();
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("clubContext");

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}