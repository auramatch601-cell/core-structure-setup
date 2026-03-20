
-- 1) Create atomic settle_bet_batch function
CREATE OR REPLACE FUNCTION public.settle_bet_batch(
  p_match_id TEXT,
  p_match_title TEXT,
  p_winner_label TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_bet RECORD;
  v_settled INT := 0;
  v_payouts INT := 0;
  v_new_balance NUMERIC;
  v_is_win BOOLEAN;
  v_profit_loss NUMERIC;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  FOR v_bet IN
    SELECT * FROM bets
    WHERE match_id = p_match_id AND status = 'open'
    FOR UPDATE SKIP LOCKED
  LOOP
    v_is_win := lower(trim(v_bet.selection_label)) = lower(trim(p_winner_label));
    v_profit_loss := CASE WHEN v_is_win THEN v_bet.potential_win - v_bet.stake ELSE -v_bet.stake END;

    UPDATE bets SET
      status = CASE WHEN v_is_win THEN 'won' ELSE 'lost' END,
      profit_loss = v_profit_loss,
      settled_at = v_now
    WHERE id = v_bet.id AND status = 'open';

    IF v_is_win THEN
      UPDATE wallet_balances
      SET balance = balance + v_bet.potential_win, updated_at = v_now
      WHERE user_id = v_bet.user_id
      RETURNING balance INTO v_new_balance;

      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id)
      VALUES (v_bet.user_id, 'bet_win', v_bet.potential_win, v_new_balance,
              'Win: ' || v_bet.selection_label || ' · ' || v_bet.market_name, v_bet.id::TEXT);
      v_payouts := v_payouts + 1;
    END IF;

    INSERT INTO notifications (user_id, type, title, body, reference_id)
    VALUES (
      v_bet.user_id,
      CASE WHEN v_is_win THEN 'bet_won' ELSE 'bet_lost' END,
      CASE WHEN v_is_win THEN '🏆 Bet Won — ₹' || v_bet.potential_win::TEXT ELSE '📉 Bet Lost — ' || v_bet.selection_label END,
      v_bet.selection_label || ' · ' || v_bet.market_name || ' · ' || p_match_title,
      v_bet.id::TEXT
    );
    v_settled := v_settled + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'settled', v_settled, 'payouts', v_payouts, 'match_id', p_match_id, 'winner', p_winner_label);
END;
$$;

-- 2) Create atomic wallet_deposit function
CREATE OR REPLACE FUNCTION public.wallet_deposit(p_amount NUMERIC, p_description TEXT DEFAULT 'Deposit')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RETURN json_build_object('error', 'invalid_amount'); END IF;

  UPDATE wallet_balances SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = v_user_id RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN RETURN json_build_object('error', 'wallet_not_found'); END IF;

  INSERT INTO transactions (user_id, type, amount, balance_after, description)
  VALUES (v_user_id, 'deposit', p_amount, v_new_balance, p_description);

  RETURN json_build_object('success', true, 'balance', v_new_balance);
END;
$$;

-- 3) Create atomic wallet_withdraw function
CREATE OR REPLACE FUNCTION public.wallet_withdraw(p_amount NUMERIC, p_description TEXT DEFAULT 'Withdrawal')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RETURN json_build_object('error', 'invalid_amount'); END IF;

  SELECT balance INTO v_balance FROM wallet_balances WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'wallet_not_found'); END IF;
  IF v_balance < p_amount THEN RETURN json_build_object('error', 'insufficient_balance', 'balance', v_balance); END IF;

  v_new_balance := v_balance - p_amount;
  UPDATE wallet_balances SET balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, description)
  VALUES (v_user_id, 'withdrawal', -p_amount, v_new_balance, p_description);

  RETURN json_build_object('success', true, 'balance', v_new_balance);
END;
$$;

-- 4) Insert default bet_limits row if not exists
INSERT INTO bet_limits (market_name, min_stake, max_stake, max_win)
VALUES ('default', 10, 50000, 500000)
ON CONFLICT DO NOTHING;

-- 5) Add unique constraint for market_suspensions upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_suspensions_match_id_market_name_key'
  ) THEN
    ALTER TABLE public.market_suspensions ADD CONSTRAINT market_suspensions_match_id_market_name_key UNIQUE (match_id, market_name);
  END IF;
END $$;

-- 6) Create handle_new_user trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
