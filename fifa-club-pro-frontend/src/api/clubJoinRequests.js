// src/api/clubJoinRequests.js
import { api } from "./client";

/**
 * GET /clubs/:clubId/join-requests
 * Response: { club: {id,name}, requests: [...] }
 */
export async function fetchJoinRequests(clubId) {
  const res = await api.get(`/clubs/${clubId}/join-requests`);
  return res.data;
}

/**
 * PUT /clubs/:clubId/join-requests/:userId
 * Body: { action: "accept" | "reject" }
 */
export async function resolveJoinRequest(clubId, userId, action) {
  const res = await api.put(`/clubs/${clubId}/join-requests/${userId}`, { action });
  return res.data;
}