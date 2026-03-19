import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { LayoutContext } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, ArrowDownLeft, Gift, TrendingUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

const TX_ICONS: Record<string, React.ReactNode> = {
  deposit: <ArrowDownLeft className="w-4 h-4 text-success" />,
  withdrawal: <ArrowUpRight className="w-4 h-4 text-loss" />,
  bet_placed: <Minus className="w-4 h-4 text-yellow" />,
  bet_win: <TrendingUp className="w-4 h-4 text-success" />,
  bet_refund: <TrendingUp className="w-4 h-4 text-blue" />,
  bonus: <Gift className="w-4 h-4 text-blue" />,
};

const DEPOSIT_AMOUNTS = [500, 1000, 2000, 5000];

const Wallet: React.FC = () => {
  const { wallet } = useOutletContext<LayoutContext>();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchTx = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setTransactions(data ?? []);
      setTxLoading(false);
    };
    fetchTx();

    // Real-time updates for new transactions
    const channel = supabase
      .channel(`tx:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setTransactions((prev) => [payload.new as Transaction, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setDepositing(true);
    const ok = await wallet.credit(amt, "deposit", `Deposit via UPI`);
    setMsg({ text: ok ? `₹${amt.toLocaleString("en-IN")} deposited successfully!` : "Deposit failed.", ok });
    setDepositing(false);
    if (ok) { setAmount(""); setShowDeposit(false); }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > wallet.balance) return;
    setWithdrawing(true);
    // Record withdrawal as a debit transaction
    const ok = await wallet.debit(amt, `Withdrawal request`);
    setMsg({ text: ok ? `₹${amt.toLocaleString("en-IN")} withdrawal initiated.` : "Insufficient balance.", ok });
    setWithdrawing(false);
    if (ok) { setAmount(""); setShowWithdraw(false); }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 lg:px-6 py-5 border-b border-border">
        <h1 className="font-condensed font-black text-2xl tracking-wider uppercase">Wallet</h1>
      </div>

      <div className="px-4 lg:px-6 py-6">
        <div className="bg-surface-card border border-border rounded p-6 max-w-lg">
          <p className="section-label mb-2">Available Balance</p>
          {wallet.loading ? (
            <div className="h-10 w-32 bg-surface-raised animate-pulse rounded mb-4" />
          ) : (
            <p className="font-condensed font-black text-4xl text-yellow leading-none mb-1">
              ₹{wallet.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          )}
          {wallet.bonusBalance > 0 && (
            <p className="font-mono text-[0.6rem] text-blue tracking-wider mb-4">
              + ₹{wallet.bonusBalance.toLocaleString("en-IN")} bonus balance
            </p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setShowDeposit(!showDeposit); setShowWithdraw(false); setAmount(""); }}
              className="cta-place-bet w-auto flex-1"
            >
              Deposit
            </button>
            <button
              onClick={() => { setShowWithdraw(!showWithdraw); setShowDeposit(false); setAmount(""); }}
              className="font-condensed font-bold text-sm uppercase tracking-widest border border-border bg-surface-raised text-foreground py-2.5 px-6 rounded hover:border-blue transition-colors flex-1"
            >
              Withdraw
            </button>
          </div>

          {msg && (
            <p className={cn(
              "mt-3 font-mono text-xs px-3 py-2 border",
              msg.ok
                ? "text-success bg-success/10 border-success/30"
                : "text-loss bg-loss/10 border-loss/30"
            )}>
              {msg.text}
            </p>
          )}

          {(showDeposit || showWithdraw) && (
            <div className="mt-4 p-4 border border-border rounded bg-surface space-y-3">
              <p className="font-condensed font-700 text-base uppercase tracking-wider">
                {showDeposit ? "Deposit Funds" : "Withdraw Funds"}
              </p>

              {showDeposit && (
                <div className="grid grid-cols-4 gap-1.5">
                  {DEPOSIT_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(String(q))}
                      className={cn(
                        "font-condensed font-600 text-xs py-1.5 border rounded transition-all",
                        amount === String(q)
                          ? "border-blue text-blue bg-blue/10"
                          : "border-border bg-surface-card hover:border-blue hover:text-blue text-muted-foreground"
                      )}
                    >
                      ₹{q >= 1000 ? `${q / 1000}K` : q}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="section-label block mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="stake-input"
                  min="1"
                />
              </div>
              <div>
                <label className="section-label block mb-1.5">
                  {showDeposit ? "Payment Method" : "Withdraw To"}
                </label>
                <select className="w-full bg-surface-card border border-border text-foreground font-mono text-sm p-2.5 rounded outline-none focus:border-blue">
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Credit/Debit Card</option>
                </select>
              </div>
              <button
                onClick={showDeposit ? handleDeposit : handleWithdraw}
                disabled={depositing || withdrawing}
                className="cta-place-bet disabled:opacity-50"
              >
                {showDeposit
                  ? (depositing ? "Processing..." : "Deposit")
                  : (withdrawing ? "Processing..." : "Withdraw")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 lg:px-6 pb-6">
        <p className="section-label mb-3">Transaction History</p>
        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-surface-card border border-border rounded animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-mono text-sm text-muted-foreground tracking-wider uppercase">
              No transactions yet
            </p>
          </div>
        ) : (
          <div className="bg-surface-card border border-border rounded overflow-hidden">
            {transactions.map((tx) => (
              <div key={tx.id} className="tx-row px-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-8 h-8 bg-surface-raised rounded flex items-center justify-center flex-shrink-0">
                    {TX_ICONS[tx.type] ?? <Minus className="w-4 h-4 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-condensed font-600 text-sm text-foreground truncate">
                      {tx.description ?? tx.type.replace(/_/g, " ")}
                    </p>
                    <p className="font-mono text-[0.55rem] text-muted-foreground tracking-wide">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      {tx.status === "pending" && (
                        <span className="ml-2 text-yellow font-semibold">PENDING</span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "font-condensed font-bold text-base flex-shrink-0",
                    tx.amount > 0 ? "text-success" : "text-foreground/80"
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
