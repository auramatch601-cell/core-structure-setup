import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useBetsDB } from "@/hooks/useBetsDB";
import { Database } from "@/integrations/supabase/types";

type Bet = Database["public"]["Tables"]["bets"]["Row"];
type BetStatus = "open" | "won" | "lost" | "void" | "cashout";

const TABS: { key: "open" | "settled" | "lost"; label: string; filter: BetStatus[] }[] = [
  { key: "open",     label: "Open Bets",     filter: ["open"] },
  { key: "settled",  label: "Settled (Won)", filter: ["won", "cashout"] },
  { key: "lost",     label: "Lost",          filter: ["lost", "void"] },
];

const MyBets: React.FC = () => {
  const { bets, loading } = useBetsDB();
  const [tab, setTab] = useState<"open" | "settled" | "lost">("open");

  const filtered = bets.filter((b) =>
    TABS.find((t) => t.key === tab)!.filter.includes(b.status as BetStatus)
  );

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 lg:px-6 py-5 border-b border-border">
        <h1 className="font-condensed font-black text-2xl tracking-wider uppercase">My Bets</h1>
      </div>

      <div className="flex border-b border-border px-4 lg:px-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("nav-tab", tab === t.key && "active")}
          >
            {t.label}
            <span className="ml-1.5 font-mono text-[0.55rem] text-muted-foreground">
              ({bets.filter((b) => t.filter.includes(b.status as BetStatus)).length})
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 lg:px-6">
        {loading ? (
          <div className="space-y-2 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-card border border-border rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-mono text-sm text-muted-foreground tracking-wider uppercase">
              No bets found
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((bet) => (
              <BetRow key={bet.id} bet={bet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const STATUS_CLASSES: Record<string, string> = {
  open:    "pill-open",
  won:     "pill-won",
  lost:    "pill-lost",
  void:    "font-mono text-[0.6rem] tracking-widest uppercase font-semibold text-muted-foreground bg-surface-raised px-2 py-0.5",
  cashout: "font-mono text-[0.6rem] tracking-widest uppercase font-semibold text-yellow bg-yellow/10 px-2 py-0.5",
};

const BetRow: React.FC<{ bet: Bet }> = ({ bet }) => {
  const profitLoss = bet.profit_loss;

  return (
    <div className="py-4 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={STATUS_CLASSES[bet.status] ?? STATUS_CLASSES.open}>
              {bet.status.toUpperCase()}
            </span>
            <span className="font-mono text-[0.55rem] text-muted-foreground/60 tracking-wide">
              #{bet.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <p className="font-mono text-[0.6rem] text-muted-foreground tracking-wider uppercase">
            {bet.match_title} · {bet.market_name}
          </p>
          <p className="font-condensed font-700 text-lg text-foreground mt-0.5">
            {bet.selection_label}
          </p>

          <div className="flex items-center gap-4 mt-2">
            <div>
              <span className="font-mono text-[0.55rem] text-muted-foreground uppercase tracking-wider block">
                Odds
              </span>
              <span className="font-condensed font-bold text-base text-yellow">
                {Number(bet.odds).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="font-mono text-[0.55rem] text-muted-foreground uppercase tracking-wider block">
                Stake
              </span>
              <span className="font-condensed font-bold text-base text-foreground">
                ₹{Number(bet.stake).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="font-mono text-[0.55rem] text-muted-foreground uppercase tracking-wider block">
                {bet.status === "won" ? "Won" : "Pot. Win"}
              </span>
              <span className={cn(
                "font-condensed font-bold text-base",
                bet.status === "won" ? "text-success" : "text-foreground/80"
              )}>
                ₹{Number(bet.potential_win).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="font-mono text-[0.55rem] text-muted-foreground/60 tracking-wide">
            {formatDistanceToNow(new Date(bet.placed_at), { addSuffix: true })}
          </span>
          {profitLoss !== null && profitLoss !== undefined && (
            <p className={cn(
              "font-condensed font-bold text-lg mt-1",
              profitLoss > 0 ? "text-success" : "text-loss"
            )}>
              {profitLoss > 0 ? "+" : ""}₹{Math.abs(profitLoss).toLocaleString("en-IN")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBets;
