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
        event: "INSERT",
        schema: "public",
        table: "bets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setBets((prev) => [payload.new as Bet, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBets]);

  const placeBet = useCallback(async (bet: Omit<Database["public"]["Tables"]["bets"]["Insert"], "user_id">): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("bets")
      .insert({ ...bet, user_id: user.id })
      .select("id")
      .single();
    if (error) return null;
    return data.id;
  }, [user]);

  return { bets, loading, fetchBets, placeBet };
}
