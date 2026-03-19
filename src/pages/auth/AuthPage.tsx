import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "forgot";

const AuthPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setError(result.error instanceof Error ? result.error.message : "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) throw err;
        setInfo("Check your email to confirm your account. You'll receive ₹1,000 welcome bonus!");
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setInfo("Password reset link sent to your email.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-condensed font-black text-3xl text-yellow tracking-[0.25em]">
            LIVE<span className="text-blue">BET</span>
          </span>
          <p className="font-mono text-[0.65rem] text-muted-foreground tracking-widest uppercase mt-1">
            Real-time sports betting
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-border rounded-none mb-6">
          <button
            onClick={() => { setMode("login"); setError(null); setInfo(null); }}
            className={cn(
              "flex-1 py-2.5 font-condensed font-bold text-sm tracking-widest uppercase transition-colors",
              mode === "login" ? "bg-blue text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
            className={cn(
              "flex-1 py-2.5 font-condensed font-bold text-sm tracking-widest uppercase transition-colors",
              mode === "signup" ? "bg-blue text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Create Account
          </button>
        </div>

        {/* Google OAuth — shown for login + signup, hidden for forgot */}
        {mode !== "forgot" && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className={cn(
                "w-full flex items-center justify-center gap-3 py-2.5 border border-border bg-surface-card",
                "font-condensed font-bold text-sm tracking-widest uppercase text-foreground",
                "hover:border-blue hover:bg-surface-raised transition-all rounded disabled:opacity-50"
              )}
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 border-t border-border" />
              <span className="font-mono text-[0.6rem] text-muted-foreground tracking-widest uppercase">or</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div>
                <label className="section-label block mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="stake-input"
                />
              </div>
            )}

            <div>
              <label className="section-label block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="stake-input"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="section-label block mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="stake-input"
                />
              </div>
            )}

            {error && (
              <p className="font-mono text-xs text-loss bg-loss/10 border border-loss/30 px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="font-mono text-xs text-success bg-success/10 border border-success/30 px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="cta-place-bet glow-blue w-full disabled:opacity-50"
            >
              {submitting
                ? "Processing..."
                : mode === "login"
                ? "Sign In"
                : mode === "signup"
                ? "Create Account — Get ₹1,000 Bonus"
                : "Send Reset Link"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                className="w-full font-mono text-[0.65rem] text-muted-foreground hover:text-foreground tracking-wider uppercase transition-colors text-center"
              >
                Forgot password?
              </button>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setInfo(null); }}
                className="w-full font-mono text-[0.65rem] text-muted-foreground hover:text-foreground tracking-wider uppercase transition-colors text-center"
              >
                ← Back to Sign In
              </button>
            )}
          </motion.form>
        </AnimatePresence>

        <p className="font-mono text-[0.55rem] text-muted-foreground/40 text-center tracking-wider mt-8">
          18+ · Please gamble responsibly · Terms apply
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
