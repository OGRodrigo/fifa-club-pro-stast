// src/api/client.js
import axios from "axios";

/**
 * Instancia única de axios:
 * - Evita repetir baseURL
 * - Permite interceptores (JWT automático)
 */
export const api = axios.create({
  baseURL: "http://localhost:3000", // TODO: ideal -> import.meta.env.VITE_API_URL
});

/**
 * Interceptor de request:
 * - Antes de CADA request agrega Authorization: Bearer <token>
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // token persistido tras login
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // formato esperado por backend
    }
    return config; // SIEMPRE retornar config
  },
  (error) => Promise.reject(error)
);
