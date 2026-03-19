
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Update timestamps function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- USER ROLES (must be created first since other tables reference it in policies)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- SECURITY DEFINER: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT,
  phone TEXT,
  avatar_url TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'unverified',
  pan_number TEXT,
  aadhaar_number TEXT,
  date_of_birth TEXT,
  kyc_submitted_at TIMESTAMPTZ,
  kyc_reviewed_at TIMESTAMPTZ,
  kyc_reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WALLET BALANCES
CREATE TABLE public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  bonus_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallet_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallet_balances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallet_balances FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC,
  description TEXT,
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BETS
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  match_title TEXT NOT NULL,
  market_name TEXT NOT NULL,
  selection_label TEXT NOT NULL,
  odds NUMERIC NOT NULL,
  stake NUMERIC NOT NULL,
  potential_win NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  profit_loss NUMERIC,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all bets" ON public.bets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bets" ON public.bets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- BET LIMITS
CREATE TABLE public.bet_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_name TEXT NOT NULL DEFAULT 'default',
  min_stake NUMERIC NOT NULL DEFAULT 10,
  max_stake NUMERIC NOT NULL DEFAULT 50000,
  max_win NUMERIC NOT NULL DEFAULT 500000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bet_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bet limits" ON public.bet_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update bet limits" ON public.bet_limits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.bet_limits (market_name, min_stake, max_stake, max_win) VALUES ('default', 10, 50000, 500000);

-- MARKET SUSPENSIONS
CREATE TABLE public.market_suspensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  market_name TEXT NOT NULL,
  reason TEXT,
  suspended_by UUID REFERENCES auth.users(id),
  suspended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, market_name)
);
ALTER TABLE public.market_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read suspensions" ON public.market_suspensions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert suspensions" ON public.market_suspensions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete suspensions" ON public.market_suspensions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ATOMIC BET PLACEMENT
CREATE OR REPLACE FUNCTION public.place_bet_atomic(
  p_match_id TEXT, p_match_title TEXT, p_market_name TEXT,
  p_selection_label TEXT, p_odds NUMERIC, p_stake NUMERIC, p_potential_win NUMERIC
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_limits RECORD;
  v_bet_id UUID;
  v_new_balance NUMERIC;
  v_suspended BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM market_suspensions WHERE match_id = p_match_id AND market_name = p_market_name) INTO v_suspended;
  IF v_suspended THEN RETURN json_build_object('error', 'market_suspended'); END IF;

  SELECT min_stake, max_stake, max_win INTO v_limits FROM bet_limits WHERE market_name = 'default';
  IF NOT FOUND THEN v_limits := ROW(10, 50000, 500000); END IF;

  IF p_stake < v_limits.min_stake THEN RETURN json_build_object('error', 'stake_too_low', 'min_stake', v_limits.min_stake); END IF;
  IF p_stake > v_limits.max_stake THEN RETURN json_build_object('error', 'stake_too_high', 'max_stake', v_limits.max_stake); END IF;
  IF p_potential_win > v_limits.max_win THEN RETURN json_build_object('error', 'max_win_exceeded', 'max_win', v_limits.max_win); END IF;

  SELECT balance INTO v_balance FROM wallet_balances WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_balance < p_stake THEN RETURN json_build_object('error', 'insufficient_balance', 'balance', COALESCE(v_balance, 0)); END IF;

  v_new_balance := v_balance - p_stake;
  UPDATE wallet_balances SET balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;

  INSERT INTO bets (user_id, match_id, match_title, market_name, selection_label, odds, stake, potential_win)
  VALUES (v_user_id, p_match_id, p_match_title, p_market_name, p_selection_label, p_odds, p_stake, p_potential_win)
  RETURNING id INTO v_bet_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (v_user_id, 'bet_placed', -p_stake, v_new_balance, 'Bet: ' || p_selection_label || ' @ ' || p_odds, v_bet_id::TEXT);

  RETURN json_build_object('success', true, 'bet_id', v_bet_id, 'balance', v_new_balance);
END;
$$;

-- AUTO-CREATE PROFILE + WALLET ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.wallet_balances (user_id, balance, bonus_balance) VALUES (NEW.id, 1000, 0);
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description) VALUES (NEW.id, 'bonus', 1000, 1000, 'Welcome bonus');
  INSERT INTO public.notifications (user_id, type, title, body) VALUES (NEW.id, 'system', 'Welcome to LiveBet!', 'Your account has been created with a ₹1,000 welcome bonus.');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_suspensions;
