// src/api/auth.js
import http from "./http";

export async function login(email, password) {
  const { data } = await http.post("/auth/login", { email, password });
  return data; // { token, user, clubContext? }
}

export async function register(payload) {
  // payload: { username, email, password, gamerTag, platform, country }
  const { data } = await http.post("/auth/register", payload);
  return data;
}

export async function me() {
  const { data } = await http.get("/auth/me");
  return data; // { clubContext: {clubId, role} } o { clubContext: null }
}
