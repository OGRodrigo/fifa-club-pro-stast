// src/api/matches.js
import { api } from "./client";

export async function listMatches() {
  const { data } = await api.get("/matches");
  return data;
}

export async function createMatch(payload) {
  const { data } = await api.post("/matches", payload);
  return data;
}
