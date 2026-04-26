import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Eye, EyeOff } from "lucide-react";
import gcpLogo from "@/assets/logo.png";
import ppsLogo from "@/assets/logo-pps.png";

export default function PlatformLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // If a remembered session exists, skip the login screen.
  // Use onAuthStateChange first so we react correctly to fresh sign-out events
  // (otherwise a stale session can briefly bounce the user back to /platform).
  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        navigate("/platform", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        navigate("/platform", { replace: true });
      } else {
        setCheckingSession(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    navigate("/platform");
  };

  if (checkingSession) {
    return (
      <div className="ops-theme min-h-screen flex items-center justify-center bg-background px-4">
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="ops-theme relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-[#0a0a0c]">
      {/* Animated ambient gradient backdrop (orange → red → green palm accent) */}
      <style>{`
        @keyframes loginAuraDrift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: 0.85; }
          50% { transform: translate3d(2%, -3%, 0) scale(1.08); opacity: 1; }
        }
        @keyframes loginAuraDriftAlt {
          0%, 100% { transform: translate3d(0,0,0) scale(1.05); opacity: 0.7; }
          50% { transform: translate3d(-3%, 2%, 0) scale(1); opacity: 0.95; }
        }
        @keyframes loginCardEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 85%, rgba(234,88,12,0.55), transparent 70%)," +
            "radial-gradient(55% 45% at 90% 90%, rgba(234,179,8,0.35), transparent 70%)",
          animation: "loginAuraDrift 9s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(45% 35% at 80% 10%, rgba(34,197,94,0.30), transparent 70%)," +
            "radial-gradient(40% 30% at 10% 5%, rgba(190,18,60,0.30), transparent 70%)",
          animation: "loginAuraDriftAlt 11s ease-in-out infinite",
        }}
      />
      {/* Grain / vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)" }}
      />

      <div
        className="relative z-10 w-full max-w-sm"
        style={{ animation: "loginCardEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div
          className="rounded-3xl p-7 backdrop-blur-2xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
          style={{
            background:
              "linear-gradient(160deg, rgba(28,28,32,0.85) 0%, rgba(20,20,24,0.75) 100%)",
          }}
        >
          {/* Brand row */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center overflow-hidden p-1.5 shadow-lg">
              <img src={gcpLogo} alt="Gulf Coast Palms logo" className="w-full h-full object-contain" width={48} height={48} fetchPriority="high" decoding="async" />
            </div>
            <div className="h-6 w-px bg-white/15" aria-hidden="true" />
            <div className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center overflow-hidden p-1.5 shadow-lg">
              <img src={ppsLogo} alt="Prestige Property Services logo" className="w-full h-full object-contain" width={48} height={48} fetchPriority="high" decoding="async" />
            </div>
          </div>

          {/* Welcome */}
          <div className="text-center mb-7">
            <p className="font-body text-base text-white/55">Welcome back!</p>
            <h1 className="font-display text-3xl text-white font-semibold tracking-tight flex items-center justify-center gap-2 mt-1">
              <Briefcase className="w-6 h-6 text-white/80" strokeWidth={2.25} />
              Sign In
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-body text-sm text-white/85">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Your email address"
                className="h-12 rounded-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/40 px-5 focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-body text-sm text-white/85">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="h-12 rounded-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/40 px-5 pr-12 focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="relative h-12 px-7 rounded-full font-body font-semibold text-white border-0 shadow-[0_10px_30px_-10px_rgba(234,88,12,0.7)] hover:brightness-110 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #b91c1c 0%, #ea580c 50%, #f59e0b 100%)",
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <button
                type="button"
                onClick={() => toast({ title: "Contact your admin", description: "Password resets are handled by the workspace owner." })}
                className="font-body text-sm text-white/85 hover:text-white transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>

        <p className="text-center font-body text-xs text-white/40 mt-6">Field Ops Platform · Multi-Business Operations</p>
      </div>
    </div>
  );
}
