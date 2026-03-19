import { useState, useEffect, useCallback, useRef } from "react";
import { Match, INITIAL_MATCHES } from "@/data/mockData";

// ---------------------------------------------------------------------------
// Local odds nudge engine (fallback / enrichment)
// ---------------------------------------------------------------------------
function nudgeOdds(value: number): { value: number; trend: "up" | "down" | null } {
  const delta = (Math.random() - 0.5) * 0.12;
  const newVal = Math.max(1.01, Math.round((value + delta) * 100) / 100);
  const trend = newVal > value ? "up" : newVal < value ? "down" : null;
  return { value: newVal, trend };
}

// ---------------------------------------------------------------------------
// CricAPI live match shape (minimal)
// ---------------------------------------------------------------------------
interface CricAPIMatch {
  id: string;
  name: string;
  status: string;
  matchType: string;
  score?: { r: number; w: number; o: number; inning: string }[];
  teamInfo?: { name: string; shortname: string }[];
  dateTimeGMT?: string;
}

// Map a CricAPI match to our internal Match shape (merges with mock data where possible)
function mapCricAPIMatch(apiMatch: CricAPIMatch, existing?: Match): Partial<Match> {
  const isLive = apiMatch.status === "Live" || apiMatch.status?.toLowerCase().includes("live");
  const score1 = apiMatch.score?.[0]
    ? `${apiMatch.score[0].r}/${apiMatch.score[0].w} (${apiMatch.score[0].o} ov)`
    : undefined;
  const score2 = apiMatch.score?.[1]
    ? `${apiMatch.score[1].r}/${apiMatch.score[1].w} (${apiMatch.score[1].o} ov)`
    : undefined;

  const nameParts = apiMatch.name.split(" vs ");
  const team1 = (apiMatch.teamInfo?.[0]?.shortname) ?? (nameParts[0]?.trim() ?? "");
  const team2 = (apiMatch.teamInfo?.[1]?.shortname) ?? (nameParts[1]?.trim() ?? "");

  return {
    id: existing?.id ?? apiMatch.id,
    team1: (team1 || existing?.team1) ?? "",
    team2: (team2 || existing?.team2) ?? "",
    score1: score1 ?? existing?.score1,
    score2: score2 ?? existing?.score2,
    status: isLive ? "live" : (existing?.status ?? "upcoming"),
    sport: "Cricket",
    detail: apiMatch.score?.[0] ? `${apiMatch.score[0].o} ov` : existing?.detail,
    markets: existing?.markets ?? [],
    league: existing?.league ?? (apiMatch.matchType?.toUpperCase() ?? "CRICKET"),
    time: existing?.time ?? (apiMatch.dateTimeGMT ? new Date(apiMatch.dateTimeGMT).toLocaleTimeString() : "TBD"),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLiveOdds() {
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});
  const oddsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cricTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------------------------------------------------------------------
  // Fetch live cricket data from our edge function proxy
  // Silently falls back to simulated data on any error
  // ------------------------------------------------------------------
  const fetchCricketData = useCallback(async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      if (!supabaseUrl || !supabaseKey) return;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      const res = await fetch(
        `${supabaseUrl}/functions/v1/cricapi-proxy?endpoint=currentMatches`,
        {
          signal: controller.signal,
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      clearTimeout(timeout);

      // Any non-200 → silently use simulated odds
      if (!res.ok) return;

      const json = await res.json();

      // If the response is an error object, bail out silently
      if (json?.error || !json?.data || !Array.isArray(json.data)) return;

      const liveApiMatches: CricAPIMatch[] = json.data.filter(
        (m: CricAPIMatch) => m.matchType === "t20" || m.matchType === "odi" || m.matchType === "test"
      );

      if (liveApiMatches.length === 0) return;

      setMatches((prev) => {
        const updated = [...prev];

        liveApiMatches.forEach((apiMatch) => {
          const existingIdx = updated.findIndex(
            (m) => m.id === apiMatch.id ||
              (m.sport === "Cricket" && m.team1.toLowerCase().includes(
                (apiMatch.name.split(" vs ")[0]?.trim() ?? "").toLowerCase()
              ))
          );

          if (existingIdx >= 0) {
            const patch = mapCricAPIMatch(apiMatch, updated[existingIdx]);
            updated[existingIdx] = { ...updated[existingIdx], ...patch };
          }
        });

        return updated;
      });
    } catch {
      // Silently fail — fall back to simulated odds, never show an error
    }
  }, []);

  // ------------------------------------------------------------------
  // Simulated odds engine (always running for all sports)
  // ------------------------------------------------------------------
  const updateOdds = useCallback(() => {
    const newFlash: Record<string, "up" | "down"> = {};

    setMatches((prev) =>
      prev.map((match) => {
        if (match.status !== "live") return match;
        return {
          ...match,
          markets: match.markets.map((market) => ({
            ...market,
            odds: market.odds.map((odd) => {
              if (Math.random() > 0.35) return { ...odd, trend: null };
              const { value, trend } = nudgeOdds(odd.value);
              if (trend) newFlash[odd.id] = trend;
              return { ...odd, value, trend };
            }),
          })),
          // Cricket score bumps
          ...(match.sport === "Cricket" && Math.random() > 0.7
            ? {
                score1: match.score1
                  ? (() => {
                      const parts = match.score1.split("/");
                      if (parts.length < 2) return match.score1;
                      const runs = parseInt(parts[0]);
                      return `${runs + Math.floor(Math.random() * 6)}/${parts[1]}`;
                    })()
                  : match.score1,
              }
            : {}),
          // Football minute bumps
          ...(match.sport === "Football" && match.detail && Math.random() > 0.8
            ? {
                detail: (() => {
                  const min = parseInt(match.detail ?? "0");
                  return `${Math.min(90, min + 1)}'`;
                })(),
              }
            : {}),
        };
      })
    );

    setFlashMap(newFlash);
    setTimeout(() => setFlashMap({}), 1600);
  }, []);

  useEffect(() => {
    // Odds simulation: every 2.8s
    oddsTimerRef.current = setInterval(updateOdds, 2800);

    // Cricket live data: every 60s (CricAPI free tier: ~100 req/day)
    fetchCricketData();
    cricTimerRef.current = setInterval(fetchCricketData, 60_000);

    return () => {
      if (oddsTimerRef.current) clearInterval(oddsTimerRef.current);
      if (cricTimerRef.current) clearInterval(cricTimerRef.current);
    };
  }, [updateOdds, fetchCricketData]);

  return { matches, flashMap };
}
