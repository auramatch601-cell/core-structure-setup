import React, { useState, useEffect } from "react";
import { Shield, Mail, User, Lock, Bell, LogOut, FileText, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type KycStatus = "unverified" | "pending" | "verified" | "rejected";

interface ProfileData {
  display_name: string | null;
  username: string | null;
  phone: string | null;
  kyc_status: KycStatus;
  pan_number: string | null;
  aadhaar_number: string | null;
  date_of_birth: string | null;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  kyc_reject_reason: string | null;
}

const KYC_STATUS_CONFIG: Record<KycStatus, { label: string; color: string; icon: React.ReactNode }> = {
  unverified: { label: "UNVERIFIED",  color: "text-muted-foreground", icon: <Shield className="w-3 h-3" /> },
  pending:    { label: "KYC PENDING", color: "text-yellow",           icon: <Clock className="w-3 h-3" /> },
  verified:   { label: "KYC VERIFIED",color: "text-success",          icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:   { label: "KYC REJECTED",color: "text-loss",             icon: <XCircle className="w-3 h-3" /> },
};

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [kycTab, setKycTab] = useState(false);
  const [betsStats, setBetsStats] = useState({ total: 0, wins: 0, wagered: 0, profit: 0 });

  // KYC form state
  const [kycForm, setKycForm] = useState({ pan: "", aadhaar: "", dob: "" });
  const [kycSaving, setKycSaving] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycSuccess, setKycSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, phone, kyc_status, pan_number, aadhaar_number, date_of_birth, kyc_submitted_at, kyc_reviewed_at, kyc_reject_reason")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const p = data as ProfileData;
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setKycForm({
          pan:    p.pan_number ?? "",
          aadhaar: p.aadhaar_number ?? "",
          dob:    p.date_of_birth ?? "",
        });
      }
      setLoading(false);
    };
    const fetchStats = async () => {
      const { data: bets } = await supabase
        .from("bets")
        .select("stake, potential_win, profit_loss, status")
        .eq("user_id", user.id);
      if (bets) {
        const wagered = bets.reduce((s, b) => s + Number(b.stake), 0);
        const wins = bets.filter((b) => b.status === "won").length;
        const profit = bets.reduce((s, b) => s + (Number(b.profit_loss) || 0), 0);
        setBetsStats({ total: bets.length, wins, wagered, profit });
      }
    };
    fetchProfile();
    fetchStats();
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    setProfile((p) => p ? { ...p, display_name: displayName } : p);
    setEditingName(false);
    setSaving(false);
  };

  // Validate PAN: AAAAA9999A format
  const validatePan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
  // Validate Aadhaar: 12 digits
  const validateAadhaar = (aadh: string) => /^\d{12}$/.test(aadh.replace(/\s/g, ""));
  // Validate age: must be 18+
  const validateAge = (dob: string) => {
    if (!dob) return false;
    const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 18;
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError(null);
    const panUpper = kycForm.pan.toUpperCase().trim();
    const aadhaarClean = kycForm.aadhaar.replace(/\s/g, "").trim();
    if (!validatePan(panUpper))          { setKycError("Invalid PAN format. Expected: AAAAA9999A"); return; }
    if (!validateAadhaar(aadhaarClean))  { setKycError("Aadhaar must be 12 digits"); return; }
    if (!validateAge(kycForm.dob))       { setKycError("You must be 18 or older to use this platform"); return; }

    setKycSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        pan_number:       panUpper,
        aadhaar_number:   aadhaarClean,
        date_of_birth:    kycForm.dob,
        kyc_status:       "pending",
        kyc_submitted_at: new Date().toISOString(),
      })
      .eq("user_id", user!.id);

    if (error) {
      setKycError("Failed to submit KYC. Please try again.");
    } else {
      setProfile((p) => p ? { ...p, kyc_status: "pending", pan_number: panUpper, aadhaar_number: aadhaarClean, date_of_birth: kycForm.dob } : p);
      setKycSuccess(true);
      setTimeout(() => setKycSuccess(false), 5000);
    }
    setKycSaving(false);
  };

  const winRate = betsStats.total > 0 ? Math.round((betsStats.wins / betsStats.total) * 100) : 0;
  const kycConfig = KYC_STATUS_CONFIG[(profile?.kyc_status as KycStatus) ?? "unverified"];

  if (loading) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="px-4 lg:px-6 py-5 border-b border-border">
          <h1 className="font-condensed font-black text-2xl tracking-wider uppercase">Profile</h1>
        </div>
        <div className="px-4 lg:px-6 py-6 space-y-3 max-w-2xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-card border border-border rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 lg:px-6 py-5 border-b border-border">
        <h1 className="font-condensed font-black text-2xl tracking-wider uppercase">Profile</h1>
      </div>

      <div className="px-4 lg:px-6 py-6 max-w-2xl space-y-6">
        {/* User Info */}
        <div className="bg-surface-card border border-border rounded p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-blue/20 rounded flex items-center justify-center">
              <User className="w-7 h-7 text-blue" />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="stake-input flex-1"
                    autoFocus
                    maxLength={50}
                  />
                  <button onClick={handleSaveName} disabled={saving} className="font-mono text-[0.65rem] text-success tracking-wider uppercase">
                    {saving ? "..." : "Save"}
                  </button>
                  <button onClick={() => setEditingName(false)} className="font-mono text-[0.65rem] text-muted-foreground tracking-wider uppercase">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-condensed font-black text-xl text-foreground truncate">
                    {profile?.display_name || "Unnamed Player"}
                  </h2>
                  <button onClick={() => setEditingName(true)} className="font-mono text-[0.55rem] text-blue tracking-wider uppercase hover:text-blue/80">
                    Edit
                  </button>
                </div>
              )}
              <p className="font-mono text-[0.65rem] text-muted-foreground tracking-wider truncate">{user?.email}</p>
              <span className={cn("inline-flex items-center gap-1 mt-1 font-mono text-[0.55rem] tracking-wider uppercase", kycConfig.color)}>
                {kycConfig.icon}
                {kycConfig.label}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Bets",    value: String(betsStats.total) },
              { label: "Win Rate",      value: `${winRate}%` },
              { label: "Total Wagered", value: `₹${betsStats.wagered.toLocaleString("en-IN")}` },
              {
                label: "Total P&L",
                value: `${betsStats.profit >= 0 ? "+" : ""}₹${Math.abs(betsStats.profit).toLocaleString("en-IN")}`,
                positive: betsStats.profit >= 0,
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-raised border border-border rounded p-3">
                <p className="section-label mb-1">{stat.label}</p>
                <p className={cn("font-condensed font-black text-lg", "positive" in stat ? (stat.positive ? "text-success" : "text-loss") : "text-foreground")}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* KYC Verification */}
        <div className="bg-surface-card border border-border rounded overflow-hidden">
          <button
            onClick={() => setKycTab((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className={cn("w-4 h-4", kycConfig.color)} />
              <h3 className="font-condensed font-700 text-base tracking-wider uppercase">KYC Verification</h3>
            </div>
            <span className={cn("font-mono text-[0.6rem] tracking-wider uppercase font-semibold px-2 py-0.5 rounded", kycConfig.color, "bg-current/10")}>
              {kycConfig.label}
            </span>
          </button>

          {kycTab && (
            <div className="border-t border-border px-5 pb-5 pt-4">
              {profile?.kyc_status === "verified" ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="font-mono text-[0.7rem] tracking-wider">Identity verified. You can place bets.</p>
                </div>
              ) : profile?.kyc_status === "pending" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-yellow">
                    <Clock className="w-4 h-4" />
                    <p className="font-mono text-[0.7rem] tracking-wider">Your documents are under review. Usually takes 24–48 hours.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-surface-raised border border-border rounded p-3">
                      <p className="section-label mb-1">PAN</p>
                      <p className="font-mono text-xs text-foreground">
                        {profile.pan_number?.slice(0, 3)}••••{profile.pan_number?.slice(-2)}
                      </p>
                    </div>
                    <div className="bg-surface-raised border border-border rounded p-3">
                      <p className="section-label mb-1">Aadhaar</p>
                      <p className="font-mono text-xs text-foreground">
                        ••••{profile.aadhaar_number?.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : profile?.kyc_status === "rejected" ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-loss">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="font-mono text-[0.7rem] tracking-wider">
                      KYC rejected: {profile.kyc_reject_reason ?? "Please resubmit with correct documents."}
                    </p>
                  </div>
                  {/* Fall through to form */}
                </div>
              ) : null}

              {(profile?.kyc_status === "unverified" || profile?.kyc_status === "rejected") && (
                <form onSubmit={handleKycSubmit} className="space-y-4 mt-3">
                  <p className="font-mono text-[0.65rem] text-muted-foreground leading-relaxed">
                    Indian regulations require PAN, Aadhaar, and age verification (18+) to place bets and process withdrawals.
                  </p>

                  {/* PAN */}
                  <div>
                    <label className="section-label block mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> PAN Number
                    </label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={kycForm.pan}
                      onChange={(e) => setKycForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                      className="stake-input uppercase"
                      maxLength={10}
                      required
                    />
                    <p className="font-mono text-[0.55rem] text-muted-foreground/60 mt-1">Format: AAAAA9999A (5 letters, 4 digits, 1 letter)</p>
                  </div>

                  {/* Aadhaar */}
                  <div>
                    <label className="section-label block mb-1.5 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" /> Aadhaar Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012"
                      value={kycForm.aadhaar}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                        const formatted = v.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
                        setKycForm((f) => ({ ...f, aadhaar: formatted }));
                      }}
                      className="stake-input"
                      maxLength={14}
                      required
                    />
                    <p className="font-mono text-[0.55rem] text-muted-foreground/60 mt-1">12-digit Aadhaar number</p>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="section-label block mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Date of Birth
                    </label>
                    <input
                      type="date"
                      value={kycForm.dob}
                      onChange={(e) => setKycForm((f) => ({ ...f, dob: e.target.value }))}
                      className="stake-input"
                      max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                      required
                    />
                    <p className="font-mono text-[0.55rem] text-muted-foreground/60 mt-1">Must be 18 years or older</p>
                  </div>

                  {kycError && (
                    <p className="font-mono text-[0.65rem] text-loss tracking-wider">{kycError}</p>
                  )}
                  {kycSuccess && (
                    <p className="font-mono text-[0.65rem] text-success tracking-wider">KYC submitted for review ✓</p>
                  )}

                  <button
                    type="submit"
                    disabled={kycSaving}
                    className="cta-place-bet"
                  >
                    {kycSaving ? "Submitting..." : "Submit KYC Documents"}
                  </button>

                  <p className="font-mono text-[0.55rem] text-muted-foreground/50 text-center">
                    Your data is encrypted and stored securely. We do not share it with third parties.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-surface-card border border-border rounded overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-condensed font-700 text-base tracking-wider uppercase">Security</h3>
          </div>
          {[
            { icon: Lock, label: "Change Password",            desc: "Update your account password",       action: "Update" },
            { icon: Shield, label: "Two-Factor Authentication", desc: "Add extra security to your account", action: "Enable" },
            { icon: Mail, label: "Email Verification",          desc: user?.email_confirmed_at ? "Your email is verified" : "Email not verified", action: user?.email_confirmed_at ? "Verified" : "Resend" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-condensed font-600 text-sm text-foreground">{item.label}</p>
                  <p className="font-mono text-[0.6rem] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <button className="font-mono text-[0.65rem] text-blue tracking-wider uppercase hover:text-blue/80 transition-colors">
                {item.action}
              </button>
            </div>
          ))}
        </div>

        {/* Notification Preferences */}
        <div className="bg-surface-card border border-border rounded overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-condensed font-700 text-base tracking-wider uppercase flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h3>
          </div>
          {[
            { label: "Bet Results",        desc: "Get notified when your bets settle",     enabled: true },
            { label: "Promotions",         desc: "Receive bonus and promotion alerts",     enabled: false },
            { label: "Live Odds Alerts",   desc: "Alerts when tracked odds change significantly", enabled: true },
            { label: "Deposit/Withdrawal", desc: "Transaction confirmations",              enabled: true },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0">
              <div>
                <p className="font-condensed font-600 text-sm text-foreground">{pref.label}</p>
                <p className="font-mono text-[0.6rem] text-muted-foreground">{pref.desc}</p>
              </div>
              <div className={cn("w-10 h-5 rounded-full cursor-pointer transition-colors flex items-center", pref.enabled ? "bg-blue justify-end" : "bg-surface-raised border border-border justify-start")}>
                <div className="w-4 h-4 bg-foreground rounded-full mx-0.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Sign Out */}
        <button
          onClick={async () => { await signOut(); navigate("/auth"); }}
          className="w-full flex items-center justify-center gap-2 py-3 border border-loss/30 text-loss hover:bg-loss/10 transition-colors font-condensed font-bold text-sm tracking-widest uppercase rounded"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;
