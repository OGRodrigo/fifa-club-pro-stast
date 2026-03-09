// src/api/client.js
import axios from "axios";
import { runGlobalLogout } from "../auth/sessionManager";

/**
 * Cliente HTTP único de la app
 * ---------------------------------------------
 * - Usa VITE_API_URL si existe
 * - Si no existe, cae a localhost:3000
 * - Adjunta JWT automáticamente
 * - Si el backend responde 401 fuera de login/register,
 *   ejecuta logout global para limpiar sesión corrupta
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

/**
 * Request interceptor
 * ---------------------------------------------
 * Inserta Authorization: Bearer <token>
 * si el token existe en localStorage.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor
 * ---------------------------------------------
 * Si llega 401 y no estamos en login/register,
 * asumimos sesión vencida o inválida.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || "";

    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register");

    if (status === 401 && !isAuthEndpoint) {
      runGlobalLogout();
    }

    return Promise.reject(error);
  }
);