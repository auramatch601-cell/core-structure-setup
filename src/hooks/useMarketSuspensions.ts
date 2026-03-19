import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Suspension = Database["public"]["Tables"]["market_suspensions"]["Row"];

export const useMarketSuspensions = () => {
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("market_suspensions").select("*");
      setSuspensions(data ?? []);
    };
    fetch();

    const channel = supabase
      .channel("suspensions")
      .on("postgres_changes", { event: "*", schema: "public", table: "market_suspensions" }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const suspendMarket = async (matchId: string, marketName: string, reason?: string) => {
    await supabase.from("market_suspensions").insert({ match_id: matchId, market_name: marketName, reason: reason || null });
  };

  const unsuspendMarket = async (matchId: string, marketName: string) => {
    await supabase.from("market_suspensions").delete().eq("match_id", matchId).eq("market_name", marketName);
  };

  const isMarketSuspended = (matchId: string, marketName: string) =>
    suspensions.some((s) => s.match_id === matchId && s.market_name === marketName);

  return { suspensions, suspendMarket, unsuspendMarket, isMarketSuspended };
};
