import React from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { LayoutContext } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { ArrowLeft, Lock } from "lucide-react";

const MatchDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { matches, flashMap, betSlip, suspensions } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const match = matches.find((m) => m.id === id);

  if (!match) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-sm text-muted-foreground">Match not found</p>
      </div>
    );
  }

  const isLive = match.status === "live";

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="border-b border-border bg-surface-card">
        <div className="px-4 lg:px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-[0.65rem] tracking-wider uppercase">Back</span>
          </button>

          <div className="flex items-center gap-2 mb-2">
            {isLive && <span className="badge-live">Live</span>}
            <span className="font-mono text-[0.6rem] text-muted-foreground tracking-wider uppercase">{match.league}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-condensed font-black text-2xl lg:text-3xl text-foreground leading-none">
                {match.team1Short}
                <span className="text-muted-foreground mx-2 text-lg">vs</span>
                {match.team2Short}
              </h1>
              <p className="font-condensed text-base text-muted-foreground mt-1">
                {match.team1} vs {match.team2}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              {match.score1 && (
                <p className={cn("font-condensed font-black text-3xl leading-none", isLive ? "text-yellow" : "text-foreground")}>
                  {match.score1}
                  {match.score2 && match.score2 !== "—" && (
                    <span className="text-muted-foreground text-xl mx-1">-</span>
                  )}
                  {match.score2 !== "—" && <span className="text-foreground/80">{match.score2}</span>}
                </p>
              )}
              <p className="font-mono text-[0.62rem] text-muted-foreground tracking-wide mt-1">
                {match.detail || match.time}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Markets */}
      <div className="px-4 lg:px-6 py-4">
        <p className="section-label mb-3">{match.markets.length} Markets</p>

        <div className="space-y-3">
          {match.markets.map((market) => {
            const isSuspended = suspensions.isMarketSuspended(match.id, market.name);
            return (
              <div key={market.id} className={cn("bg-surface-card border border-border rounded", isSuspended && "opacity-70")}>
                <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", isSuspended && "bg-loss/5")}>
                  <h3 className="font-condensed font-700 text-base text-foreground tracking-wide uppercase">
                    {market.name}
                  </h3>
                  {isSuspended && (
                    <span className="flex items-center gap-1 font-mono text-[0.58rem] text-loss tracking-wider uppercase">
                      <Lock className="w-3 h-3" />
                      Suspended
                    </span>
                  )}
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {market.odds.map((odd) => {
                    const flash = flashMap[odd.id];
                    const isSelected = betSlip.selections.some(
                      (s) => s.matchId === match.id && s.marketName === market.name && s.selectionLabel === odd.label
                    );
                    return (
                      <button
                        key={odd.id}
                        onClick={() => {
                          if (!isSuspended) {
                            betSlip.addSelection({
                              matchId:        match.id,
                              matchTitle:     `${match.team1Short} vs ${match.team2Short}`,
                              marketName:     market.name,
                              selectionLabel: odd.label,
                              odds:           odd.value,
                            });
                          }
                        }}
                        disabled={isSuspended}
                        className={cn(
                          "odds-btn flex-1 min-w-[6rem]",
                          isSelected && "selected",
                          isSuspended && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <span className="odds-label">{odd.label}</span>
                        <span className={cn(
                          "odds-value",
                          !isSelected && flash === "up"   && "flash-up",
                          !isSelected && flash === "down" && "flash-down",
                          isSuspended && "text-muted-foreground"
                        )}>
                          {isSuspended ? "SUSP" : odd.value.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchDetailsPage;
