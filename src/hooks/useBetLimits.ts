import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BetLimits {
  min_stake: number;
  max_stake: number;
  max_win: number;
}

const DEFAULT_LIMITS: BetLimits = {
  min_stake: 10,
  max_stake: 50000,
  max_win: 500000,
};

let cached: BetLimits | null = null;

export function useBetLimits() {
  const [limits, setLimits] = useState<BetLimits>(cached ?? DEFAULT_LIMITS);

  useEffect(() => {
    if (cached) return;
    supabase
      .from("bet_limits")
      .select("min_stake, max_stake, max_win")
      .eq("market_name", "default")
      .single()
      .then(({ data }) => {
        if (data) {
          cached = {
            min_stake: Number(data.min_stake),
            max_stake: Number(data.max_stake),
            max_win: Number(data.max_win),
          };
          setLimits(cached);
        }
      });
  }, []);

  return limits;
}
