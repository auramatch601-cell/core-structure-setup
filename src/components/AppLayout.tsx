import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import type { BetSlipSelection } from "@/types/betting";

export interface LayoutContext {
  wallet: {
    balance: number;
    bonusBalance: number;
    loading: boolean;
    credit: (amount: number, type: string, description: string) => Promise<boolean>;
    debit: (amount: number, description: string) => Promise<boolean>;
  };
  matches: any[];
  flashMap: Record<string, string>;
  betSlip: {
    selections: BetSlipSelection[];
    addSelection: (selection: BetSlipSelection) => void;
    removeSelection: (index: number) => void;
    clearSelections: () => void;
  };
  activeSport: string;
  suspensions: {
    length: number;
    isMarketSuspended: (matchId: string, marketName: string) => boolean;
    [Symbol.iterator](): Iterator<any>;
  };
}

const AppLayout: React.FC = () => {
  const [activeSport] = useState("All");
  const [flashMap] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<BetSlipSelection[]>([]);

  const betSlip = {
    selections,
    addSelection: (sel: BetSlipSelection) => {
      setSelections((prev) => {
        const exists = prev.findIndex(
          (s) => s.matchId === sel.matchId && s.marketName === sel.marketName && s.selectionLabel === sel.selectionLabel
        );
        if (exists >= 0) {
          return prev.filter((_, i) => i !== exists);
        }
        return [...prev, sel];
      });
    },
    removeSelection: (index: number) => setSelections((prev) => prev.filter((_, i) => i !== index)),
    clearSelections: () => setSelections([]),
  };

  const wallet = {
    balance: 0,
    bonusBalance: 0,
    loading: false,
    credit: async () => true,
    debit: async () => true,
  };

  const suspensions = Object.assign([], {
    isMarketSuspended: () => false,
  });

  const context: LayoutContext = {
    wallet,
    matches: [],
    flashMap,
    betSlip,
    activeSport,
    suspensions,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* TODO: Add header, sidebar, bottom nav */}
      <main>
        <Outlet context={context} />
      </main>
    </div>
  );
};

export default AppLayout;
