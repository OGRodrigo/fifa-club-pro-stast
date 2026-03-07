// src/api/clubs.js
import { api } from "./client";

export async function createClub(payload) {
  const { data } = await api.post("/clubs", payload);
  return data;
}

export async function requestJoinClub(clubId) {
  // típico: POST /clubs/:clubId/join-requests (depende de tu backend)
  const { data } = await api.post(`/clubs/${clubId}/join-requests`);
  return data;
}

export async function getJoinRequests(clubId) {
  const { data } = await api.get(`/clubs/${clubId}/join-requests`);
  return data;
}

export async function resolveJoinRequest(clubId, userId, action) {
  const { data } = await api.put(`/clubs/${clubId}/join-requests/${userId}`, { action });
  return data;
}

export async function getMembers(clubId) {
  const { data } = await api.get(`/clubs/${clubId}/members`);
  return data;
}
