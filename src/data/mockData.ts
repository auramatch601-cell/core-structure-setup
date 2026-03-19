import type { Match } from "@/types/betting";

export const INITIAL_MATCHES: Match[] = [
  {
    id: "match-1",
    team1: "Mumbai Indians",
    team2: "Chennai Super Kings",
    team1Short: "MI",
    team2Short: "CSK",
    league: "IPL 2026",
    sport: "Cricket",
    status: "live",
    score1: "185/4",
    score2: "120/3",
    detail: "15.2 Overs",
    markets: [
      {
        id: "m1-mw",
        name: "Match Winner",
        odds: [
          { id: "m1-mw-1", label: "MI", value: 1.65 },
          { id: "m1-mw-2", label: "CSK", value: 2.25 },
        ],
      },
      {
        id: "m1-ts",
        name: "Total Sixes",
        odds: [
          { id: "m1-ts-1", label: "Over 12.5", value: 1.85 },
          { id: "m1-ts-2", label: "Under 12.5", value: 1.95 },
        ],
      },
    ],
  },
  {
    id: "match-2",
    team1: "Royal Challengers Bangalore",
    team2: "Kolkata Knight Riders",
    team1Short: "RCB",
    team2Short: "KKR",
    league: "IPL 2026",
    sport: "Cricket",
    status: "upcoming",
    time: "Today, 7:30 PM",
    markets: [
      {
        id: "m2-mw",
        name: "Match Winner",
        odds: [
          { id: "m2-mw-1", label: "RCB", value: 2.10 },
          { id: "m2-mw-2", label: "KKR", value: 1.75 },
        ],
      },
    ],
  },
  {
    id: "match-3",
    team1: "Manchester United",
    team2: "Liverpool",
    team1Short: "MUN",
    team2Short: "LIV",
    league: "Premier League",
    sport: "Football",
    status: "live",
    score1: "2",
    score2: "1",
    detail: "67'",
    markets: [
      {
        id: "m3-mw",
        name: "Match Result",
        odds: [
          { id: "m3-mw-1", label: "MUN", value: 1.45 },
          { id: "m3-mw-2", label: "Draw", value: 4.50 },
          { id: "m3-mw-3", label: "LIV", value: 6.00 },
        ],
      },
    ],
  },
];
