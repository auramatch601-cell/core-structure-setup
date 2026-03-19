export type Sport = "Cricket" | "Football" | "Basketball" | "Tennis" | "Esports";
export type MatchStatus = "live" | "upcoming" | "completed";
export type BetStatus = "open" | "won" | "lost" | "void";

export interface Odds {
  id: string;
  label: string;
  value: number;
  trend?: "up" | "down" | null;
}

export interface Market {
  id: string;
  name: string;
  odds: Odds[];
}

export interface Match {
  id: string;
  sport: Sport;
  team1: string;
  team2: string;
  team1Short: string;
  team2Short: string;
  score1?: string;
  score2?: string;
  detail?: string; // overs, quarter, set
  time: string;
  status: MatchStatus;
  markets: Market[];
  league: string;
  flagCode1?: string;
  flagCode2?: string;
}

export interface BetSelection {
  matchId: string;
  matchTitle: string;
  marketName: string;
  selectionLabel: string;
  odds: number;
}

export interface Bet {
  id: string;
  selection: BetSelection;
  stake: number;
  potentialWin: number;
  status: BetStatus;
  placedAt: string;
  settledAt?: string;
  profit?: number;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet_placed" | "bet_win" | "bonus";
  amount: number;
  description: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

export interface Notification {
  id: string;
  type: "bet_accepted" | "bet_won" | "bet_lost" | "deposit" | "withdrawal";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ── MATCHES ──────────────────────────────────────────────────
export const INITIAL_MATCHES: Match[] = [
  {
    id: "m1",
    sport: "Cricket",
    team1: "Chennai Super Kings",
    team2: "Mumbai Indians",
    team1Short: "CSK",
    team2Short: "MI",
    score1: "156/4",
    score2: "—",
    detail: "16.2 overs",
    time: "LIVE",
    status: "live",
    league: "IPL 2025",
    markets: [
      {
        id: "mkt1",
        name: "Match Winner",
        odds: [
          { id: "o1", label: "CSK", value: 1.80 },
          { id: "o2", label: "MI", value: 2.05 },
        ],
      },
      {
        id: "mkt2",
        name: "Total Runs",
        odds: [
          { id: "o3", label: "Over 170.5", value: 1.90 },
          { id: "o4", label: "Under 170.5", value: 1.85 },
        ],
      },
      {
        id: "mkt3",
        name: "Next Wicket",
        odds: [
          { id: "o5", label: "This Over", value: 3.20 },
          { id: "o6", label: "Not This Over", value: 1.38 },
        ],
      },
      {
        id: "mkt4",
        name: "Top Batsman",
        odds: [
          { id: "o7", label: "M.S. Dhoni", value: 3.50 },
          { id: "o8", label: "Ruturaj Gaikwad", value: 2.80 },
          { id: "o9", label: "Other", value: 1.60 },
        ],
      },
      {
        id: "mkt5",
        name: "Over 17 Runs",
        odds: [
          { id: "o10", label: "Over 8.5", value: 1.95 },
          { id: "o11", label: "Under 8.5", value: 1.80 },
        ],
      },
    ],
  },
  {
    id: "m2",
    sport: "Cricket",
    team1: "Royal Challengers Bangalore",
    team2: "Kolkata Knight Riders",
    team1Short: "RCB",
    team2Short: "KKR",
    score1: "210/6",
    score2: "186/8",
    detail: "Match Ended",
    time: "COMPLETED",
    status: "completed",
    league: "IPL 2025",
    markets: [
      {
        id: "mkt6",
        name: "Match Winner",
        odds: [
          { id: "o12", label: "RCB", value: 1.55 },
          { id: "o13", label: "KKR", value: 2.50 },
        ],
      },
    ],
  },
  {
    id: "m3",
    sport: "Cricket",
    team1: "Rajasthan Royals",
    team2: "Delhi Capitals",
    team1Short: "RR",
    team2Short: "DC",
    time: "Today 19:30 IST",
    status: "upcoming",
    league: "IPL 2025",
    markets: [
      {
        id: "mkt7",
        name: "Match Winner",
        odds: [
          { id: "o14", label: "RR", value: 1.65 },
          { id: "o15", label: "DC", value: 2.25 },
        ],
      },
      {
        id: "mkt8",
        name: "Total Runs",
        odds: [
          { id: "o16", label: "Over 165.5", value: 1.88 },
          { id: "o17", label: "Under 165.5", value: 1.87 },
        ],
      },
    ],
  },
  {
    id: "m4",
    sport: "Football",
    team1: "Manchester City",
    team2: "Arsenal",
    team1Short: "MCI",
    team2Short: "ARS",
    score1: "2",
    score2: "1",
    detail: "67'",
    time: "LIVE",
    status: "live",
    league: "Premier League",
    markets: [
      {
        id: "mkt9",
        name: "Match Result",
        odds: [
          { id: "o18", label: "MCI Win", value: 1.45 },
          { id: "o19", label: "Draw", value: 3.80 },
          { id: "o20", label: "ARS Win", value: 6.50 },
        ],
      },
      {
        id: "mkt10",
        name: "Both Teams to Score",
        odds: [
          { id: "o21", label: "Yes", value: 1.60 },
          { id: "o22", label: "No", value: 2.25 },
        ],
      },
      {
        id: "mkt11",
        name: "Next Goal",
        odds: [
          { id: "o23", label: "MCI", value: 1.55 },
          { id: "o24", label: "ARS", value: 2.80 },
          { id: "o25", label: "No Goal", value: 4.00 },
        ],
      },
    ],
  },
  {
    id: "m5",
    sport: "Football",
    team1: "Real Madrid",
    team2: "Barcelona",
    team1Short: "RMA",
    team2Short: "BAR",
    time: "Tomorrow 22:00 CET",
    status: "upcoming",
    league: "La Liga",
    markets: [
      {
        id: "mkt12",
        name: "Match Result",
        odds: [
          { id: "o26", label: "RMA Win", value: 2.10 },
          { id: "o27", label: "Draw", value: 3.40 },
          { id: "o28", label: "BAR Win", value: 2.90 },
        ],
      },
    ],
  },
  {
    id: "m6",
    sport: "Basketball",
    team1: "LA Lakers",
    team2: "Golden State",
    team1Short: "LAL",
    team2Short: "GSW",
    score1: "88",
    score2: "91",
    detail: "Q3 5:42",
    time: "LIVE",
    status: "live",
    league: "NBA",
    markets: [
      {
        id: "mkt13",
        name: "Match Winner",
        odds: [
          { id: "o29", label: "LAL", value: 2.30 },
          { id: "o30", label: "GSW", value: 1.65 },
        ],
      },
      {
        id: "mkt14",
        name: "Total Points",
        odds: [
          { id: "o31", label: "Over 225.5", value: 1.88 },
          { id: "o32", label: "Under 225.5", value: 1.87 },
        ],
      },
    ],
  },
  {
    id: "m7",
    sport: "Tennis",
    team1: "N. Djokovic",
    team2: "C. Alcaraz",
    team1Short: "DJO",
    team2Short: "ALC",
    score1: "6-4, 3",
    score2: "6-1, 5",
    detail: "Set 3",
    time: "LIVE",
    status: "live",
    league: "Wimbledon",
    markets: [
      {
        id: "mkt15",
        name: "Match Winner",
        odds: [
          { id: "o33", label: "Djokovic", value: 2.80 },
          { id: "o34", label: "Alcaraz", value: 1.45 },
        ],
      },
    ],
  },
  {
    id: "m8",
    sport: "Esports",
    team1: "Team Liquid",
    team2: "NaVi",
    team1Short: "TL",
    team2Short: "NAVI",
    score1: "1",
    score2: "0",
    detail: "Map 2",
    time: "LIVE",
    status: "live",
    league: "CS2 Major",
    markets: [
      {
        id: "mkt16",
        name: "Match Winner",
        odds: [
          { id: "o35", label: "TL", value: 1.70 },
          { id: "o36", label: "NaVi", value: 2.15 },
        ],
      },
      {
        id: "mkt17",
        name: "Total Maps",
        odds: [
          { id: "o37", label: "2 Maps", value: 2.20 },
          { id: "o38", label: "3 Maps", value: 1.68 },
        ],
      },
    ],
  },
];

// ── BETS ─────────────────────────────────────────────────────
export const INITIAL_BETS: Bet[] = [
  {
    id: "b1",
    selection: {
      matchId: "m2",
      matchTitle: "RCB vs KKR",
      marketName: "Match Winner",
      selectionLabel: "RCB",
      odds: 1.55,
    },
    stake: 500,
    potentialWin: 775,
    status: "won",
    placedAt: "2025-03-10T14:30:00",
    settledAt: "2025-03-10T18:00:00",
    profit: 275,
  },
  {
    id: "b2",
    selection: {
      matchId: "m2",
      matchTitle: "RCB vs KKR",
      marketName: "Total Runs",
      selectionLabel: "Over 190.5",
      odds: 1.90,
    },
    stake: 300,
    potentialWin: 570,
    status: "lost",
    placedAt: "2025-03-10T14:45:00",
    settledAt: "2025-03-10T18:00:00",
    profit: -300,
  },
  {
    id: "b3",
    selection: {
      matchId: "m1",
      matchTitle: "CSK vs MI",
      marketName: "Match Winner",
      selectionLabel: "CSK",
      odds: 1.80,
    },
    stake: 1000,
    potentialWin: 1800,
    status: "open",
    placedAt: "2025-03-10T19:20:00",
  },
];

// ── TRANSACTIONS ─────────────────────────────────────────────
export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "deposit", amount: 10000, description: "UPI Deposit", timestamp: "2025-03-08T10:00:00", status: "completed" },
  { id: "t2", type: "bet_placed", amount: -500, description: "Bet: RCB win vs KKR", timestamp: "2025-03-10T14:30:00", status: "completed" },
  { id: "t3", type: "bet_win", amount: 775, description: "Win: RCB win vs KKR", timestamp: "2025-03-10T18:00:00", status: "completed" },
  { id: "t4", type: "bet_placed", amount: -300, description: "Bet: Over 190.5 vs KKR", timestamp: "2025-03-10T14:45:00", status: "completed" },
  { id: "t5", type: "bet_placed", amount: -1000, description: "Bet: CSK win vs MI", timestamp: "2025-03-10T19:20:00", status: "completed" },
  { id: "t6", type: "bonus", amount: 500, description: "Welcome Bonus", timestamp: "2025-03-08T10:05:00", status: "completed" },
  { id: "t7", type: "deposit", amount: 5000, description: "Bank Transfer", timestamp: "2025-03-09T15:30:00", status: "completed" },
  { id: "t8", type: "withdrawal", amount: -3000, description: "Withdrawal to Bank", timestamp: "2025-03-09T16:00:00", status: "pending" },
];

// ── NOTIFICATIONS ────────────────────────────────────────────
export const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "bet_won", title: "Bet Won! 🎉", message: "Your bet on RCB win paid ₹775", timestamp: "2025-03-10T18:01:00", read: false },
  { id: "n2", type: "bet_accepted", title: "Bet Accepted", message: "CSK win @ 1.80 — ₹1000 placed", timestamp: "2025-03-10T19:20:00", read: false },
  { id: "n3", type: "deposit", title: "Deposit Successful", message: "₹5,000 credited to your wallet", timestamp: "2025-03-09T15:31:00", read: true },
  { id: "n4", type: "bet_lost", title: "Bet Settled", message: "Over 190.5 runs — Bet lost", timestamp: "2025-03-10T18:01:00", read: true },
  { id: "n5", type: "withdrawal", title: "Withdrawal Initiated", message: "₹3,000 withdrawal is pending", timestamp: "2025-03-09T16:01:00", read: true },
];

export const SPORTS: Sport[] = ["Cricket", "Football", "Basketball", "Tennis", "Esports"];

export const SPORT_ICONS: Record<Sport, string> = {
  Cricket: "🏏",
  Football: "⚽",
  Basketball: "🏀",
  Tennis: "🎾",
  Esports: "🎮",
};
