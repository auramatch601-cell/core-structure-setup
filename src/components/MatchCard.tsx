import React from "react";
import type { BetSlipSelection } from "@/types/betting";

interface MatchCardProps {
  match: any;
  flashMap: Record<string, string>;
  selectedOdds: BetSlipSelection[];
  onSelectOdd: (selection: BetSlipSelection) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, flashMap, selectedOdds, onSelectOdd }) => {
  return (
    <div className="border-b border-border py-4">
      <p className="font-condensed font-black text-lg text-foreground">
        {match.team1Short} vs {match.team2Short}
      </p>
      <p className="font-mono text-[0.6rem] text-muted-foreground">{match.league}</p>
      {/* TODO: Implement full match card UI */}
    </div>
  );
};

export default MatchCard;
