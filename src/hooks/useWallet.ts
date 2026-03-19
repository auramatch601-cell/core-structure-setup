import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface WalletState {
  balance: number;
  bonusBalance: number;
  loading: boolean;
  refresh: () => Promise<void>;
  debit: (amount: number, description: string, referenceId?: string) => Promise<boolean>;
  credit: (amount: number, type: "deposit" | "bet_win" | "bet_refund" | "bonus", description: string) => Promise<boolean>;
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

    // Real-time subscription on wallet changes
    const channel = supabase
      .channel(`wallet:${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "wallet_balances",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setBalance(Number((payload.new as { balance: number }).balance));
        setBonusBalance(Number((payload.new as { bonus_balance: number }).bonus_balance));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  const debit = useCallback(async (amount: number, description: string, referenceId?: string): Promise<boolean> => {
    if (!user || balance < amount) return false;
    const newBalance = balance - amount;
    const { error: wErr } = await supabase
      .from("wallet_balances")
      .update({ balance: newBalance })
      .eq("user_id", user.id);
    if (wErr) return false;

    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "bet_placed",
      amount: -amount,
      balance_after: newBalance,
      description,
      reference_id: referenceId,
    });
    setBalance(newBalance);
    return true;
  }, [user, balance]);

  const credit = useCallback(async (
    amount: number,
    type: "deposit" | "bet_win" | "bet_refund" | "bonus",
    description: string
  ): Promise<boolean> => {
    if (!user) return false;
    const newBalance = balance + amount;
    const { error: wErr } = await supabase
      .from("wallet_balances")
      .update({ balance: newBalance })
      .eq("user_id", user.id);
    if (wErr) return false;

    await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      amount,
      balance_after: newBalance,
      description,
    });
    setBalance(newBalance);
    return true;
  }, [user, balance]);

  return { balance, bonusBalance, loading, refresh, debit, credit };
}
