import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Database } from "@/integrations/supabase/types";

type Bet = Database["public"]["Tables"]["bets"]["Row"];

export const useBetsDB = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user.id)
        .order("placed_at", { ascending: false });
      setBets(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { bets, loading };
};
