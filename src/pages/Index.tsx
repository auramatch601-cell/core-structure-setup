import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { LayoutContext } from "@/components/AppLayout";
import MatchCard from "@/components/MatchCard";
import { cn } from "@/lib/utils";

type TabFilter = "all" | "live" | "upcoming" | "completed";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All Matches" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

const Index: React.FC = () => {
  const { matches, flashMap, betSlip, activeSport } = useOutletContext<LayoutContext>();
  const [tab, setTab] = useState<TabFilter>("all");

  const filtered = matches
    .filter((m) => activeSport === "All" || m.sport === activeSport)
    .filter((m) => tab === "all" || m.status === tab);

  const liveCount = matches.filter((m) => (activeSport === "All" || m.sport === activeSport) && m.status === "live").length;

  return (
    <div className="pb-20 lg:pb-8">
      {/* Tabs */}
      <div className="flex border-b border-border px-4 lg:px-6 overflow-x-auto gap-0 sticky top-0 lg:top-[3.25rem] bg-background z-[5]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("nav-tab", tab === t.key && "active")}
          >
            {t.label}
            {t.key === "live" && liveCount > 0 && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Match List */}
      <div className="px-4 lg:px-6">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-mono text-sm text-muted-foreground tracking-wider uppercase">
              No matches found
            </p>
          </div>
        ) : (
          filtered.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              flashMap={flashMap}
              selectedOdds={betSlip.selections}
              onSelectOdd={betSlip.addSelection}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Index;
