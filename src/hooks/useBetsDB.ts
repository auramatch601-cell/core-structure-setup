import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Database } from "@/integrations/supabase/types";

type Bet = Database["public"]["Tables"]["bets"]["Row"];

export function useBetsDB() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", user.id)
      .order("placed_at", { ascending: false });
    setBets(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchBets();

    const channel = supabase
      .channel(`bets:${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setBets((prev) => [payload.new as Bet, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setBets((prev) =>
            prev.map((b) => b.id === (payload.new as Bet).id ? (payload.new as Bet) : b)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBets]);

  return { bets, loading, fetchBets };
}
