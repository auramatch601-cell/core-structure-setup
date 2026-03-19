export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          username: string | null;
          phone: string | null;
          kyc_status: string;
          pan_number: string | null;
          aadhaar_number: string | null;
          date_of_birth: string | null;
          kyc_submitted_at: string | null;
          kyc_reviewed_at: string | null;
          kyc_reject_reason: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          bonus_balance: number;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          match_title: string;
          market_name: string;
          selection_label: string;
          odds: number;
          stake: number;
          potential_win: number;
          status: string;
          profit_loss: number | null;
          placed_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          balance_after: number | null;
          description: string | null;
          status: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      bet_limits: {
        Row: {
          id: string;
          market_name: string;
          min_stake: number;
          max_stake: number;
          max_win: number;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      market_suspensions: {
        Row: {
          id: string;
          match_id: string;
          market_name: string;
          reason: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
