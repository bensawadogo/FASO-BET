"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LiveStatus {
  status: "scheduled" | "live" | "finished";
  score_home: number | null;
  score_away: number | null;
  current_minute: number | null;
  kickoff: string | null;
  last_live_update: string | null;
}

function calcPollInterval(
  status: string,
  kickoffUtc: string | null
): number | null {
  if (status === "finished") return null;
  if (status === "live") return 15000;

  if (!kickoffUtc) return 60000;

  const now = Date.now();
  const kickoff = new Date(kickoffUtc).getTime();
  const diffMs = kickoff - now;

  if (diffMs < 0) return 15000;
  if (diffMs < 3600000) return 60000;
  return null;
}

export function useLiveMatchStatus(
  matchIds: number[],
  kickoffMap?: Record<number, string>
): Record<number, LiveStatus> {
  const [statusMap, setStatusMap] = useState<Record<number, LiveStatus>>({});
  const lastFetchRef = useRef<Record<number, number>>({});
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<Record<number, LiveStatus>>({});

  // Keep ref in sync
  statusRef.current = statusMap;

  const fetchStatus = useCallback(async () => {
    if (matchIds.length === 0) return;

    const toPoll: number[] = [];
    const now = Date.now();

    for (const id of matchIds) {
      const existing = statusRef.current[id];
      const kickoff = kickoffMap?.[id] ?? existing?.kickoff ?? null;
      const interval = calcPollInterval(
        existing?.status ?? "scheduled",
        kickoff
      );
      if (interval === null) continue;

      const lastFetch = lastFetchRef.current[id] ?? 0;
      if (now - lastFetch >= interval) {
        toPoll.push(id);
      }
    }

    if (toPoll.length === 0) return;

    try {
      const ids = toPoll.join(",");
      const res = await fetch(`/api/matches/live-status/?ids=${ids}`);
      const data = await res.json();

      setStatusMap((prev) => {
        const next = { ...prev };
        for (const [idStr, st] of Object.entries(data.matchs ?? {})) {
          next[Number(idStr)] = st as LiveStatus;
          lastFetchRef.current[Number(idStr)] = Date.now();
        }
        return next;
      });
    } catch {
      // Silently fail
    }
  }, [matchIds, kickoffMap]);

  useEffect(() => {
    fetchStatus();

    const scheduleNext = () => {
      const now = Date.now();
      let nextMs = 5000;

      for (const id of matchIds) {
        const existing = statusRef.current[id];
        const kickoff = kickoffMap?.[id] ?? existing?.kickoff ?? null;
        const interval = calcPollInterval(
          existing?.status ?? "scheduled",
          kickoff
        );
        if (interval === null) continue;

        const lastFetch = lastFetchRef.current[id] ?? 0;
        const dueIn = interval - (now - lastFetch);
        if (dueIn <= 0) {
          fetchStatus();
          return;
        }
        nextMs = Math.min(nextMs, dueIn);
      }

      tickRef.current = setTimeout(scheduleNext, nextMs);
    };

    tickRef.current = setTimeout(scheduleNext, 5000);

    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [matchIds, kickoffMap, fetchStatus]);

  return statusMap;
}
