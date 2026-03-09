let logoutHandler = null;

export function registerLogoutHandler(handler) {
  logoutHandler = handler;
}

export function runGlobalLogout() {
  if (typeof logoutHandler === "function") {
    logoutHandler();
    return;
  }

  // Fallback de seguridad
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("clubContext");

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}