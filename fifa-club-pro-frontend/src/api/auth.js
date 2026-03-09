// src/api/auth.js
import { api } from "./client";

/**
 * =====================================================
 * AUTH API
 * -----------------------------------------------------
 * Capa de servicios de autenticación del frontend.
 *
 * Usa el cliente HTTP compartido de la app:
 * - baseURL desde VITE_API_URL
 * - Authorization Bearer automático
 * - manejo centralizado de 401
 *
 * Endpoints esperados:
 * - POST /auth/login
 * - POST /auth/register
 * - GET  /auth/me
 * =====================================================
 */

/**
 * Login
 * -----------------------------------------------------
 * Recibe credenciales y devuelve sesión inicial.
 *
 * Respuesta esperada del backend:
 * {
 *   token,
 *   user,
 *   clubContext? // opcional
 * }
 */
export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

/**
 * Register
 * -----------------------------------------------------
 * payload esperado:
 * {
 *   username,
 *   email,
 *   password,
 *   gamerTag,
 *   platform,
 *   country
 * }
 */
export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

/**
 * Me
 * -----------------------------------------------------
 * Recupera el estado actual del usuario autenticado.
 *
 * Respuesta esperada:
 * {
 *   user,
 *   clubContext: { clubId, role } | null,
 *   memberships?: [...]
 * }
 */
export async function me() {
  const { data } = await api.get("/auth/me");
  return data;
}