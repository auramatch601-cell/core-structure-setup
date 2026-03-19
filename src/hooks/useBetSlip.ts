import { useState, useEffect, useRef, useCallback } from "react";
import { BetSelection } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type ConfirmationPhase = "idle" | "validating" | "confirmed" | "sending" | "accepted" | "error" | "odds_changed";

const PHASES: { phase: ConfirmationPhase; text: string; delay: number }[] = [
  { phase: "validating", text: "VALIDATING...",        delay: 0 },
  { phase: "confirmed",  text: "ODDS_CONFIRMED",       delay: 620 },
  { phase: "sending",    text: "SENDING_TO_LEDGER...", delay: 1180 },
  { phase: "accepted",   text: "BET_ACCEPTED",         delay: 1900 },
];

// Track when each selection was added so we can detect odds drift
interface SelectionWithTimestamp extends BetSelection {
  addedAt: number;
  lockedOdds: number; // odds at the moment user clicked
}

export function useBetSlip() {
  const { user } = useAuth();
  const [selections, setSelections] = useState<SelectionWithTimestamp[]>([]);
  const [stake, setStake] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState<ConfirmationPhase>("idle");
  const [confirmText, setConfirmText] = useState<string>("");
  // Odds-change state: when live odds drift from locked odds
  const [oddsChangedSel, setOddsChangedSel] = useState<SelectionWithTimestamp | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addSelection = (sel: BetSelection) => {
    setSelections((prev) => {
      const exists = prev.find(
        (s) => s.matchId === sel.matchId && s.marketName === sel.marketName
      );
      if (exists) {
        if (exists.selectionLabel === sel.selectionLabel) {
          // Deselect
          return prev.filter(
            (s) => !(s.matchId === sel.matchId && s.marketName === sel.marketName)
          );
        }
        // Replace with new selection
        return prev.map((s) =>
          s.matchId === sel.matchId && s.marketName === sel.marketName
            ? { ...sel, addedAt: Date.now(), lockedOdds: sel.odds }
            : s
        );
      }
      return [...prev, { ...sel, addedAt: Date.now(), lockedOdds: sel.odds }];
    });
    setOddsChangedSel(null);
    setIsOpen(true);
  };

  // Call this from the live-odds hook when odds update, to detect drift
  const updateSelectionOdds = useCallback((matchId: string, marketName: string, selLabel: string, newOdds: number) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.matchId === matchId && s.marketName === marketName && s.selectionLabel === selLabel) {
          return { ...s, odds: newOdds };
        }
        return s;
      })
    );
  }, []);

  const removeSelection = (matchId: string, marketName: string) => {
    setSelections((prev) =>
      prev.filter((s) => !(s.matchId === matchId && s.marketName === marketName))
    );
    setOddsChangedSel(null);
  };

  const clearAll = () => {
    setSelections([]);
    setStake("");
    setConfirmPhase("idle");
    setConfirmText("");
    setOddsChangedSel(null);
  };

  const potentialWin =
    stake && selections.length > 0
      ? (parseFloat(stake) * selections[0].odds).toFixed(2)
      : "0.00";

  const acceptOddsChange = () => {
    if (!oddsChangedSel) return;
    setSelections((prev) =>
      prev.map((s) =>
        s.matchId === oddsChangedSel.matchId && s.marketName === oddsChangedSel.marketName
          ? { ...s, lockedOdds: s.odds }
          : s
      )
    );
    setOddsChangedSel(null);
  };

  const placeBet = useCallback(async () => {
    if (!stake || parseFloat(stake) <= 0 || !user) return;

    const sel = selections[0];

    // Check for odds drift
    const oddsDrift = Math.abs(sel.odds - sel.lockedOdds) > 0.01;
    if (oddsDrift) {
      setOddsChangedSel(sel);
      return;
    }

    const stakeAmount = parseFloat(stake);
    const win = parseFloat(potentialWin);

    setConfirmPhase("validating");
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    PHASES.forEach(({ phase, text, delay }) => {
      const t = setTimeout(() => {
        setConfirmPhase(phase);
        setConfirmText(text);
      }, delay);
      timersRef.current.push(t);
    });

    const sendTimer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("place_bet_atomic", {
          p_match_id:        sel.matchId,
          p_match_title:     sel.matchTitle,
          p_market_name:     sel.marketName,
          p_selection_label: sel.selectionLabel,
          p_odds:            sel.odds,
          p_stake:           stakeAmount,
          p_potential_win:   win,
        });

        if (error) throw error;

        const result = data as {
          error?: string;
          success?: boolean;
          bet_id?: string;
          min_stake?: number;
          max_stake?: number;
          max_win?: number;
          balance?: number;
        };

        if (result?.error === "insufficient_balance") {
          setConfirmPhase("error");
          setConfirmText("INSUFFICIENT_BALANCE");
        } else if (result?.error === "stake_too_low") {
          setConfirmPhase("error");
          setConfirmText(`MIN_STAKE_₹${result.min_stake ?? 10}`);
        } else if (result?.error === "stake_too_high") {
          setConfirmPhase("error");
          setConfirmText(`MAX_STAKE_₹${(result.max_stake ?? 50000).toLocaleString("en-IN")}`);
        } else if (result?.error === "max_win_exceeded") {
          setConfirmPhase("error");
          setConfirmText(`MAX_WIN_₹${(result.max_win ?? 500000).toLocaleString("en-IN")}`);
        } else if (result?.error === "market_suspended") {
          setConfirmPhase("error");
          setConfirmText("MARKET_SUSPENDED");
        } else if (result?.error) {
          throw new Error(result.error);
        } else {
          // Persist notification
          if (result?.bet_id && user) {
            await supabase.from("notifications").insert({
              user_id:      user.id,
              type:         "bet_accepted",
              title:        "Bet Accepted",
              body:         `${sel.selectionLabel} · ${sel.marketName} @ ${sel.odds.toFixed(2)} · Stake ₹${stakeAmount.toLocaleString("en-IN")}`,
              reference_id: result.bet_id,
            });
          }
          return; // success path — let the ACCEPTED phase timer run
        }

        // Error path: reset after 2.5s
        timersRef.current.push(
          setTimeout(() => { setConfirmPhase("idle"); setConfirmText(""); }, 2500)
        );

      } catch {
        setConfirmPhase("error");
        setConfirmText("BET_FAILED");
        timersRef.current.push(
          setTimeout(() => { setConfirmPhase("idle"); setConfirmText(""); }, 2500)
        );
      }
    }, 1180);
    timersRef.current.push(sendTimer);

    // Close after acceptance
    const finishTimer = setTimeout(() => {
      setConfirmPhase("idle");
      setConfirmText("");
      setSelections([]);
      setStake("");
      setIsOpen(false);
    }, 3800);
    timersRef.current.push(finishTimer);
  }, [stake, selections, potentialWin, user]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const isConfirming = confirmPhase !== "idle" && confirmPhase !== "odds_changed";

  // Expose plain selections (without internal timestamps) for UI consumption
  const publicSelections: BetSelection[] = selections.map(({ addedAt: _a, lockedOdds: _l, ...rest }) => rest);

  return {
    selections: publicSelections,
    stake,
    setStake,
    isOpen,
    setIsOpen,
    addSelection,
    removeSelection,
    updateSelectionOdds,
    clearAll,
    potentialWin,
    placeBet,
    isConfirming,
    confirmPhase,
    confirmText,
    oddsChangedSel: oddsChangedSel
      ? { ...oddsChangedSel }
      : null,
    acceptOddsChange,
  };
}
