import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Suspension {
  id: string;
  match_id: string;
  market_name: string;
  reason: string | null;
  suspended_at: string;
}

export function useMarketSuspensions() {
  const { user } = useAuth();
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  const fetchSuspensions = useCallback(async () => {
    const { data } = await supabase
      .from("market_suspensions")
      .select("id, match_id, market_name, reason, suspended_at");
    if (data) setSuspensions(data as Suspension[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSuspensions();

    // Realtime: sync suspensions live
    const channel = supabase
      .channel("market-suspensions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_suspensions" },
        () => fetchSuspensions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchSuspensions]);

  const isMarketSuspended = (matchId: string, marketName: string) =>
    suspensions.some((s) => s.match_id === matchId && s.market_name === marketName);

  const suspendMarket = async (matchId: string, marketName: string, reason?: string) => {
    await supabase.from("market_suspensions").upsert(
      { match_id: matchId, market_name: marketName, reason: reason ?? null, suspended_by: user?.id },
      { onConflict: "match_id,market_name" }
    );
  };

  const unsuspendMarket = async (matchId: string, marketName: string) => {
    await supabase
      .from("market_suspensions")
      .delete()
      .eq("match_id", matchId)
      .eq("market_name", marketName);
  };

  return { suspensions, isMarketSuspended, suspendMarket, unsuspendMarket, refetch: fetchSuspensions };
}
