import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Users, BarChart3, Trophy, Banknote, AlertTriangle,
  Settings, CheckCircle2, XCircle, RefreshCw, ShieldAlert, Lock, Unlock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useMarketSuspensions } from "@/hooks/useMarketSuspensions";
import { INITIAL_MATCHES } from "@/data/mockData";
import { formatDistanceToNow } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type AdminTab = "matches" | "bets" | "transactions" | "settlement" | "suspensions" | "limits";
type Bet = Database["public"]["Tables"]["bets"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: "matches",     label: "Matches",     icon: <Trophy className="w-3.5 h-3.5" /> },
  { key: "bets",        label: "All Bets",    icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { key: "transactions",label: "Transactions",icon: <Banknote className="w-3.5 h-3.5" /> },
  { key: "settlement",  label: "Settle Bets", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "suspensions", label: "Suspensions", icon: <Lock className="w-3.5 h-3.5" /> },
  { key: "limits",      label: "Bet Limits",  icon: <ShieldAlert className="w-3.5 h-3.5" /> },
];

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>("matches");
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ openBets: 0, totalBets: 0, liveMatches: 0, totalWagered: 0 });

  // Settlement state
  const [selectedMatch, setSelectedMatch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [winnerLabel, setWinnerLabel] = useState("");
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<{ text: string; ok: boolean } | null>(null);

  // Suspensions
  const { suspensions, suspendMarket, unsuspendMarket } = useMarketSuspensions();
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendMatchId, setSuspendMatchId] = useState("");
  const [suspendMarketName, setSuspendMarketName] = useState("");

  // Bet limits
  const [limitsForm, setLimitsForm] = useState({ min_stake: "10", max_stake: "50000", max_win: "500000" });
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limitsMsg, setLimitsMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: allBets }, { data: allTx }, { data: limitsData }] = await Promise.all([
      supabase.from("bets").select("*").order("placed_at", { ascending: false }).limit(200),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("bet_limits").select("min_stake,max_stake,max_win").eq("market_name", "default").single(),
    ]);
    const betsData = allBets ?? [];
    setBets(betsData);
    setTransactions(allTx ?? []);
    setStats({
      openBets:     betsData.filter((b) => b.status === "open").length,
      totalBets:    betsData.length,
      liveMatches:  INITIAL_MATCHES.filter((m) => m.status === "live").length,
      totalWagered: betsData.reduce((s, b) => s + Number(b.stake), 0),
    });
    if (limitsData) {
      setLimitsForm({
        min_stake: String(limitsData.min_stake),
        max_stake: String(limitsData.max_stake),
        max_win:   String(limitsData.max_win),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSettle = async () => {
    if (!selectedMatch || !winnerLabel || !user) return;
    setSettling(true);
    setSettleResult(null);
    try {
      const match = INITIAL_MATCHES.find((m) => m.id === selectedMatch);
      if (!match) throw new Error("Match not found");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settle-bets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ matchId: selectedMatch, matchTitle: `${match.team1Short} vs ${match.team2Short}`, winnerLabel }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Settlement failed");
      setSettleResult({ text: `✓ Settled ${data.settled} bets. ${data.payouts} payouts issued.`, ok: true });
      fetchData();
      setWinnerLabel("");
    } catch (err) {
      setSettleResult({ text: err instanceof Error ? err.message : "Settlement failed", ok: false });
    }
    setSettling(false);
    setTimeout(() => setSettleResult(null), 6000);
  };

  const handleSaveLimits = async () => {
    setLimitsSaving(true);
    const { error } = await supabase
      .from("bet_limits")
      .update({ min_stake: Number(limitsForm.min_stake), max_stake: Number(limitsForm.max_stake), max_win: Number(limitsForm.max_win) })
      .eq("market_name", "default");
    setLimitsMsg(error ? { text: "Failed to save limits", ok: false } : { text: "Limits saved successfully", ok: true });
    setLimitsSaving(false);
    setTimeout(() => setLimitsMsg(null), 4000);
  };

  const matchForSettlement = INITIAL_MATCHES.find((m) => m.id === selectedMatch);
  const marketForSettlement = matchForSettlement?.markets.find((mk) => mk.id === selectedMarket);
  const suspendMatchObj = INITIAL_MATCHES.find((m) => m.id === suspendMatchId);

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 lg:px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-blue" />
          <h1 className="font-condensed font-black text-2xl tracking-wider uppercase">Admin Dashboard</h1>
        </div>
        <button onClick={fetchData} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 lg:px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Live Matches",  val: stats.liveMatches,  color: "text-success" },
          { label: "Open Bets",     val: stats.openBets,     color: "text-yellow" },
          { label: "Total Bets",    val: stats.totalBets,    color: "text-blue" },
          { label: "Total Wagered", val: `₹${stats.totalWagered.toLocaleString("en-IN")}`, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-card border border-border rounded p-3">
            <p className="section-label">{s.label}</p>
            <p className={cn("font-condensed font-black text-xl mt-1", s.color)}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4 lg:px-6 overflow-x-auto gap-0">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("nav-tab flex items-center gap-1.5", tab === t.key && "active")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 lg:px-6 py-4">

        {/* MATCHES TAB */}
        {tab === "matches" && (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr><th>Match</th><th>League</th><th>Status</th><th>Markets</th><th>Action</th></tr></thead>
              <tbody>
                {INITIAL_MATCHES.map((m) => (
                  <tr key={m.id}>
                    <td className="font-condensed font-600">{m.team1Short} vs {m.team2Short}</td>
                    <td className="font-mono text-[0.7rem] text-muted-foreground">{m.league}</td>
                    <td>
                      <span className={cn("font-mono text-[0.6rem] uppercase tracking-wider font-semibold",
                        m.status === "live" ? "text-success" : m.status === "upcoming" ? "text-yellow" : "text-muted-foreground"
                      )}>{m.status}</span>
                    </td>
                    <td className="font-mono text-sm">{m.markets.length}</td>
                    <td>
                      <button onClick={() => { setSelectedMatch(m.id); setTab("settlement"); }} className="font-mono text-[0.62rem] text-blue hover:underline tracking-wider">SETTLE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BETS TAB */}
        {tab === "bets" && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-surface-card border border-border rounded animate-pulse" />)}</div>
            ) : bets.length === 0 ? (
              <p className="font-mono text-sm text-muted-foreground py-12 text-center">No bets yet</p>
            ) : (
              <table className="w-full data-table">
                <thead><tr><th>ID</th><th>Match</th><th>Selection</th><th>Odds</th><th>Stake</th><th>Status</th><th>P&L</th><th>Placed</th></tr></thead>
                <tbody>
                  {bets.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-[0.65rem] text-muted-foreground">{b.id.slice(0, 8).toUpperCase()}</td>
                      <td className="font-condensed font-600 text-xs">{b.match_title}</td>
                      <td className="text-xs">{b.selection_label}</td>
                      <td className="font-condensed font-bold text-yellow">{Number(b.odds).toFixed(2)}</td>
                      <td className="font-condensed font-bold">₹{Number(b.stake).toLocaleString("en-IN")}</td>
                      <td>
                        <span className={cn("font-mono text-[0.6rem] uppercase tracking-wider font-semibold",
                          b.status === "won" ? "pill-won" : b.status === "lost" ? "pill-lost" : "pill-open"
                        )}>{b.status}</span>
                      </td>
                      <td className={cn("font-condensed font-bold text-sm",
                        b.profit_loss == null ? "text-muted-foreground" : Number(b.profit_loss) > 0 ? "text-success" : "text-loss"
                      )}>
                        {b.profit_loss == null ? "—" : `${Number(b.profit_loss) > 0 ? "+" : ""}₹${Math.abs(Number(b.profit_loss)).toLocaleString("en-IN")}`}
                      </td>
                      <td className="font-mono text-[0.6rem] text-muted-foreground">{formatDistanceToNow(new Date(b.placed_at), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {tab === "transactions" && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-surface-card border border-border rounded animate-pulse" />)}</div>
            ) : transactions.length === 0 ? (
              <p className="font-mono text-sm text-muted-foreground py-12 text-center">No transactions yet</p>
            ) : (
              <table className="w-full data-table">
                <thead><tr><th>ID</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance After</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-mono text-[0.65rem] text-muted-foreground">{tx.id.slice(0, 8).toUpperCase()}</td>
                      <td className="font-mono text-[0.7rem] uppercase tracking-wider">{tx.type.replace(/_/g, " ")}</td>
                      <td className="text-xs text-muted-foreground">{tx.description ?? "—"}</td>
                      <td className={cn("font-condensed font-bold", tx.amount > 0 ? "text-success" : "text-foreground/80")}>
                        {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="font-mono text-xs text-muted-foreground">
                        {tx.balance_after != null ? `₹${Number(tx.balance_after).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td>
                        <span className={cn("font-mono text-[0.6rem] uppercase tracking-wider font-semibold",
                          tx.status === "completed" ? "text-success" : tx.status === "pending" ? "text-yellow" : "text-loss"
                        )}>{tx.status}</span>
                      </td>
                      <td className="font-mono text-[0.6rem] text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SETTLEMENT TAB */}
        {tab === "settlement" && (
          <div className="max-w-lg space-y-5">
            <div className="bg-surface-card border border-border rounded p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-yellow" />
                <h2 className="font-condensed font-700 text-base uppercase tracking-wider">Settle Match Bets</h2>
              </div>
              <div>
                <label className="section-label block mb-1.5">Match</label>
                <select value={selectedMatch} onChange={(e) => { setSelectedMatch(e.target.value); setSelectedMarket(""); setWinnerLabel(""); }}
                  className="w-full bg-surface-card border border-border text-foreground font-mono text-sm p-2.5 rounded outline-none focus:border-blue">
                  <option value="">— Select match —</option>
                  {INITIAL_MATCHES.map((m) => <option key={m.id} value={m.id}>{m.team1Short} vs {m.team2Short} · {m.league} ({m.status})</option>)}
                </select>
              </div>
              {matchForSettlement && (
                <div>
                  <label className="section-label block mb-1.5">Market</label>
                  <select value={selectedMarket} onChange={(e) => { setSelectedMarket(e.target.value); setWinnerLabel(""); }}
                    className="w-full bg-surface-card border border-border text-foreground font-mono text-sm p-2.5 rounded outline-none focus:border-blue">
                    <option value="">— Select market —</option>
                    {matchForSettlement.markets.map((mk) => <option key={mk.id} value={mk.id}>{mk.name}</option>)}
                  </select>
                </div>
              )}
              {marketForSettlement && (
                <div>
                  <label className="section-label block mb-1.5">Winning Selection</label>
                  <div className="flex flex-wrap gap-2">
                    {marketForSettlement.odds.map((o) => (
                      <button key={o.id} onClick={() => setWinnerLabel(o.label)}
                        className={cn("font-condensed font-600 text-sm py-2 px-4 border rounded transition-all",
                          winnerLabel === o.label ? "border-success text-success bg-success/10" : "border-border bg-surface hover:border-success hover:text-success text-muted-foreground"
                        )}>
                        {o.label} @ {o.value.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedMatch && (
                <div className="bg-surface-raised border border-border rounded p-3">
                  <p className="font-mono text-[0.65rem] text-muted-foreground">
                    Open bets: <span className="text-yellow font-semibold">{bets.filter((b) => b.match_id === selectedMatch && b.status === "open").length}</span>
                  </p>
                </div>
              )}
              <button onClick={handleSettle} disabled={!selectedMatch || !winnerLabel || settling}
                className="cta-place-bet disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 justify-center">
                {settling ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Settling...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Settle Bets</>}
              </button>
              {settleResult && (
                <div className={cn("font-mono text-xs px-3 py-2.5 border rounded",
                  settleResult.ok ? "text-success bg-success/10 border-success/30" : "text-loss bg-loss/10 border-loss/30"
                )}>
                  {settleResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" /> : <XCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                  {settleResult.text}
                </div>
              )}
            </div>
            <div>
              <p className="section-label mb-3">Recently Settled</p>
              <div className="bg-surface-card border border-border rounded overflow-hidden">
                {bets.filter((b) => b.status !== "open").slice(0, 10).length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground text-center py-8">No settled bets yet</p>
                ) : bets.filter((b) => b.status !== "open").slice(0, 10).map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-condensed font-600 text-sm">{b.selection_label}</p>
                      <p className="font-mono text-[0.6rem] text-muted-foreground">{b.match_title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-condensed font-bold text-sm", b.status === "won" ? "text-success" : "text-loss")}>
                        {b.profit_loss != null ? `${Number(b.profit_loss) > 0 ? "+" : ""}₹${Math.abs(Number(b.profit_loss)).toLocaleString("en-IN")}` : "—"}
                      </span>
                      <span className={cn("font-mono text-[0.6rem] uppercase tracking-wider font-semibold", b.status === "won" ? "pill-won" : "pill-lost")}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUSPENSIONS TAB */}
        {tab === "suspensions" && (
          <div className="max-w-lg space-y-5">
            <div className="bg-surface-card border border-border rounded p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-loss" />
                <h2 className="font-condensed font-700 text-base uppercase tracking-wider">Suspend Market</h2>
              </div>
              <p className="font-mono text-[0.65rem] text-muted-foreground">Suspended markets block all new bets instantly.</p>
              <div>
                <label className="section-label block mb-1.5">Match</label>
                <select value={suspendMatchId} onChange={(e) => { setSuspendMatchId(e.target.value); setSuspendMarketName(""); }}
                  className="w-full bg-surface-card border border-border text-foreground font-mono text-sm p-2.5 rounded outline-none focus:border-blue">
                  <option value="">— Select match —</option>
                  {INITIAL_MATCHES.map((m) => <option key={m.id} value={m.id}>{m.team1Short} vs {m.team2Short}</option>)}
                </select>
              </div>
              {suspendMatchObj && (
                <div>
                  <label className="section-label block mb-1.5">Market</label>
                  <select value={suspendMarketName} onChange={(e) => setSuspendMarketName(e.target.value)}
                    className="w-full bg-surface-card border border-border text-foreground font-mono text-sm p-2.5 rounded outline-none focus:border-blue">
                    <option value="">— Select market —</option>
                    {suspendMatchObj.markets.map((mk) => <option key={mk.id} value={mk.name}>{mk.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="section-label block mb-1.5">Reason (optional)</label>
                <input type="text" placeholder="e.g. Wicket fallen, goal scored..."
                  value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                  className="stake-input" maxLength={120} />
              </div>
              <button
                onClick={() => { if (suspendMatchId && suspendMarketName) { suspendMarket(suspendMatchId, suspendMarketName, suspendReason); setSuspendReason(""); } }}
                disabled={!suspendMatchId || !suspendMarketName}
                className="w-full py-2.5 border border-loss/50 bg-loss/10 text-loss font-condensed font-700 text-sm uppercase tracking-wider rounded hover:bg-loss/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" /> Suspend Market
              </button>
            </div>

            {/* Active suspensions */}
            <div>
              <p className="section-label mb-3">Active Suspensions ({suspensions.length})</p>
              {suspensions.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground text-center py-8 bg-surface-card border border-border rounded">No markets suspended</p>
              ) : (
                <div className="bg-surface-card border border-border rounded overflow-hidden">
                  {suspensions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-condensed font-600 text-sm text-loss">{s.market_name}</p>
                        <p className="font-mono text-[0.6rem] text-muted-foreground">{s.match_id} · {s.reason ?? "No reason"}</p>
                      </div>
                      <button onClick={() => unsuspendMarket(s.match_id, s.market_name)}
                        className="flex items-center gap-1 font-mono text-[0.62rem] text-success hover:text-success/80 tracking-wider uppercase">
                        <Unlock className="w-3 h-3" /> Unsuspend
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BET LIMITS TAB */}
        {tab === "limits" && (
          <div className="max-w-sm space-y-5">
            <div className="bg-surface-card border border-border rounded p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-yellow" />
                <h2 className="font-condensed font-700 text-base uppercase tracking-wider">Global Bet Limits</h2>
              </div>
              <p className="font-mono text-[0.65rem] text-muted-foreground">These limits apply to all markets. Changes take effect immediately.</p>
              {[
                { key: "min_stake", label: "Min Stake (₹)", desc: "Minimum stake per bet" },
                { key: "max_stake", label: "Max Stake (₹)", desc: "Maximum stake per bet" },
                { key: "max_win",   label: "Max Win (₹)",   desc: "Maximum payout per bet" },
              ].map(({ key, label, desc }) => (
                <div key={key}>
                  <label className="section-label block mb-1.5">{label}</label>
                  <input type="number" value={limitsForm[key as keyof typeof limitsForm]}
                    onChange={(e) => setLimitsForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="stake-input" min="1" />
                  <p className="font-mono text-[0.55rem] text-muted-foreground/60 mt-1">{desc}</p>
                </div>
              ))}
              <button onClick={handleSaveLimits} disabled={limitsSaving}
                className="cta-place-bet disabled:opacity-40">
                {limitsSaving ? "Saving..." : "Save Limits"}
              </button>
              {limitsMsg && (
                <p className={cn("font-mono text-[0.65rem] tracking-wider", limitsMsg.ok ? "text-success" : "text-loss")}>
                  {limitsMsg.text}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
