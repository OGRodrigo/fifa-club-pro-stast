// src/api/client.js
import axios from "axios";

/**
 * Instancia única de axios
 * - Usa variable de entorno para backend
 * - Mantiene fallback local para desarrollo
 * - Permite enviar credenciales si luego las necesitas
 * - Agrega JWT automáticamente en cada request
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

/**
 * Interceptor de request
 * - Antes de cada request agrega Authorization: Bearer <token>
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);