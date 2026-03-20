import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface WalletState {
  balance: number;
  bonusBalance: number;
  loading: boolean;
  refresh: () => Promise<void>;
  deposit: (amount: number, description?: string) => Promise<boolean>;
  withdraw: (amount: number, description?: string) => Promise<boolean>;
}

export function useWallet(): WalletState {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallet_balances")
      .select("balance, bonus_balance")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setBalance(Number(data.balance));
      setBonusBalance(Number(data.bonus_balance));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    refresh();

    const channel = supabase
      .channel(`wallet:${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wallet_balances",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new && typeof payload.new === "object") {
          const row = payload.new as { balance: number; bonus_balance: number };
          setBalance(Number(row.balance));
          setBonusBalance(Number(row.bonus_balance));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  const deposit = useCallback(async (amount: number, description?: string): Promise<boolean> => {
    if (!user || amount <= 0) return false;
    const { data, error } = await supabase.rpc("wallet_deposit", {
      p_amount: amount,
      p_description: description ?? "Deposit via UPI",
    });
    if (error) return false;
    const result = data as { success?: boolean; balance?: number; error?: string };
    if (result?.success && result.balance != null) {
      setBalance(result.balance);
      return true;
    }
    return false;
  }, [user]);

  const withdraw = useCallback(async (amount: number, description?: string): Promise<boolean> => {
    if (!user || amount <= 0) return false;
    const { data, error } = await supabase.rpc("wallet_withdraw", {
      p_amount: amount,
      p_description: description ?? "Withdrawal request",
    });
    if (error) return false;
    const result = data as { success?: boolean; balance?: number; error?: string };
    if (result?.success && result.balance != null) {
      setBalance(result.balance);
      return true;
    }
    return false;
  }, [user]);

  return { balance, bonusBalance, loading, refresh, deposit, withdraw };
}
