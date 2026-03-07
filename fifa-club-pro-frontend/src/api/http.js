// src/api/http.js
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {}; // ✅ importante
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
