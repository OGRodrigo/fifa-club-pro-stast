// src/season/useSeason.js
import { useEffect, useState } from "react";

const KEY = "fifa_selected_season";

/**
 * useSeason
 * - season guardada en localStorage
 * - compartida por HomeAdmin/HomeMember/etc
 */
export function useSeason() {
  const [season, setSeason] = useState(() => {
    try {
      return localStorage.getItem(KEY) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      if (season) localStorage.setItem(KEY, String(season));
      else localStorage.removeItem(KEY);
    } catch {
      // no-op
    }
  }, [season]);

  return { season, setSeason };
}