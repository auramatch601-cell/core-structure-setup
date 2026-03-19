export interface BetSlipSelection {
  matchId: string;
  matchTitle: string;
  marketName: string;
  selectionLabel: string;
  odds: number;
}

export interface Match {
  id: string;
  team1: string;
  team2: string;
  team1Short: string;
  team2Short: string;
  league: string;
  sport: string;
  status: "live" | "upcoming" | "completed";
  score1?: string;
  score2?: string;
  time?: string;
  detail?: string;
  markets: Market[];
}

export interface Market {
  id: string;
  name: string;
  odds: Odd[];
}

export interface Odd {
  id: string;
  label: string;
  value: number;
}
