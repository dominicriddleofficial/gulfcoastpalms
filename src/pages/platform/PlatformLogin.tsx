import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, WifiOff } from "lucide-react";
import gcpLogo from "@/assets/logo.png";
import ppsLogo from "@/assets/logo-pps.png";
import { isOutageError } from "@/lib/outageDetect";
import { listMirroredBusinesses } from "@/lib/offlineMirror";

export default function PlatformLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [outageMode, setOutageMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // If a remembered session exists, skip the login screen.
  // Wait for INITIAL_SESSION before deciding whether to show the form.
  useEffect(() => {
    let cancelled = false;
    let initialSessionLoaded = false;
    let hadSession = false;

    const fallbackTimer = window.setTimeout(() => {
      if (cancelled || initialSessionLoaded) return;
      initialSessionLoaded = true;
      setCheckingSession(false);
      // Treat a >8s stall as a probable outage: if we have a snapshot + mirror,
      // offer the offline copy to the user.
      setOutageMode(true);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "INITIAL_SESSION") {
        initialSessionLoaded = true;
        hadSession = !!session;
        if (session) {
          navigate("/platform", { replace: true });
        } else {
          setCheckingSession(false);
        }
        return;
      }

      if (event === "SIGNED_IN" && session) {
        hadSession = true;
        navigate("/platform", { replace: true });
        return;
      }

      if (event === "SIGNED_OUT") {
        const activeLogout = initialSessionLoaded && hadSession;
        hadSession = false;
        if (activeLogout) setCheckingSession(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Detect whether an offline copy is available on this device.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const SNAPSHOT_PREFIX = "platform_access_snapshot:";
        let hasSnapshot = false;
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(SNAPSHOT_PREFIX)) { hasSnapshot = true; break; }
        }
        if (!hasSnapshot) return;
        const mirrored = await listMirroredBusinesses();
        if (!cancelled && mirrored.length > 0) setOfflineAvailable(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isOutageError(error)) setOutageMode(true);
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
    <div className="ops-theme relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-[#05070a]">
      <style>{`
        @keyframes loginOrbA { 0%,100% { transform: translate3d(-8%, 4%, 0) scale(1); opacity: 0.55; } 50% { transform: translate3d(6%, -6%, 0) scale(1.12); opacity: 0.75; } }
        @keyframes loginOrbB { 0%,100% { transform: translate3d(6%, -4%, 0) scale(1.08); opacity: 0.4; } 50% { transform: translate3d(-4%, 6%, 0) scale(1); opacity: 0.6; } }
        @keyframes loginOrbC { 0%,100% { transform: translate3d(0%, 0%, 0) scale(1); opacity: 0.35; } 50% { transform: translate3d(-6%, -2%, 0) scale(1.06); opacity: 0.55; } }
        @keyframes loginRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loginStagger { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loginShine { 0% { transform: translateX(-140%) skewX(-18deg); } 55%,100% { transform: translateX(240%) skewX(-18deg); } }
        .login-stage > * { opacity: 0; animation: loginStagger 520ms cubic-bezier(0.22,1,0.36,1) both; }
        .login-stage > *:nth-child(1) { animation-delay: 180ms; }
        .login-stage > *:nth-child(2) { animation-delay: 260ms; }
        .login-stage > *:nth-child(3) { animation-delay: 340ms; }
        .login-stage > *:nth-child(4) { animation-delay: 420ms; }
        .login-stage > *:nth-child(5) { animation-delay: 500ms; }
        .login-input { transition: border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease; }
        .login-input:focus-visible { border-color: rgba(var(--biz-accent-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--biz-accent-rgb), 0.15), 0 0 24px -6px rgba(var(--biz-accent-rgb), 0.45) !important; outline: none !important; }
        .login-submit { position: relative; overflow: hidden; transition: transform 120ms ease, box-shadow 200ms ease, filter 200ms ease; }
        .login-submit:active { transform: scale(0.98); }
        .login-submit::after { content: ""; position: absolute; top: 0; left: 0; width: 45%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: loginShine 6s ease-in-out infinite; pointer-events: none; }
        @media (prefers-reduced-motion: reduce) {
          .login-stage > *, [data-login-card] { animation: none !important; opacity: 1 !important; transform: none !important; }
          [data-login-orb] { animation: none !important; }
          .login-submit::after { display: none; }
        }
      `}</style>

      {/* Ambient accent orbs — transform/opacity only */}
      <div
        data-login-orb
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[620px] h-[620px] rounded-full z-0"
        style={{
          background: "radial-gradient(closest-side, rgba(var(--biz-accent-rgb), 0.22), transparent 70%)",
          filter: "blur(60px)",
          animation: "loginOrbA 72s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      <div
        data-login-orb
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -right-40 w-[720px] h-[720px] rounded-full z-0"
        style={{
          background: "radial-gradient(closest-side, rgba(var(--biz-accent-rgb), 0.18), transparent 70%)",
          filter: "blur(70px)",
          animation: "loginOrbB 88s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      <div
        data-login-orb
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full z-0"
        style={{
          background: "radial-gradient(closest-side, rgba(var(--biz-accent-rgb), 0.10), transparent 70%)",
          filter: "blur(80px)",
          animation: "loginOrbC 66s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      {/* Vignette to light the card center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 42%, rgba(0,0,0,0.65) 100%)" }}
      />

      <div
        data-login-card
        className="relative z-10 w-full max-w-sm"
        style={{ animation: "loginRise 620ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div
          className="relative rounded-3xl p-7 backdrop-blur-2xl"
          style={{
            background: "linear-gradient(160deg, rgba(16,20,18,0.78) 0%, rgba(10,12,12,0.72) 100%)",
            border: "1px solid rgba(var(--biz-accent-rgb), 0.12)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 60px -20px rgba(var(--biz-accent-rgb), 0.18), 0 30px 80px -20px rgba(0,0,0,0.8)",
          }}
        >
          <div className="login-stage space-y-6">
            {/* Brand row */}
            <div className="flex items-center justify-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, #0e1310 0%, #050807 100%)",
                  border: "1px solid rgba(var(--biz-accent-rgb), 0.28)",
                  boxShadow: "inset 0 0 18px -4px rgba(var(--biz-accent-rgb), 0.35), 0 6px 20px -8px rgba(0,0,0,0.9)",
                }}
              >
                <img src={gcpLogo} alt="Gulf Coast Palms logo" className="w-full h-full object-contain p-2" width={56} height={56} fetchPriority="high" decoding="async" />
              </div>
              <div
                className="h-8 w-px"
                aria-hidden="true"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(var(--biz-accent-rgb), 0.55), transparent)" }}
              />
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, #0e1310 0%, #050807 100%)",
                  border: "1px solid rgba(var(--biz-accent-rgb), 0.28)",
                  boxShadow: "inset 0 0 18px -4px rgba(var(--biz-accent-rgb), 0.35), 0 6px 20px -8px rgba(0,0,0,0.9)",
                }}
              >
                <img src={ppsLogo} alt="Prestige Property Services logo" className="w-full h-full object-contain p-2" width={56} height={56} fetchPriority="high" decoding="async" />
              </div>
            </div>

            {/* Type lockup */}
            <div className="text-center">
              <p
                className="font-body text-[11px] font-semibold uppercase mb-2"
                style={{ letterSpacing: "0.22em", color: "rgba(var(--biz-accent-rgb), 0.85)" }}
              >
                Field Ops Platform
              </p>
              <h1 className="font-display text-4xl text-white font-semibold tracking-tight leading-none">Sign In</h1>
              <p className="font-body text-sm text-white/50 mt-2">Multi-business command center</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body text-xs uppercase tracking-wider text-white/60">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Your email address"
                  className="login-input h-12 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/35 px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-body text-xs uppercase tracking-wider text-white/60">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="login-input h-12 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/35 px-4 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center text-white/55 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="login-submit h-12 px-8 rounded-full font-body font-semibold text-white border-0 hover:brightness-110"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(var(--biz-accent-rgb), 1) 0%, rgba(var(--biz-accent-rgb), 0.75) 100%)",
                    boxShadow:
                      "0 10px 30px -10px rgba(var(--biz-accent-rgb), 0.7), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  onClick={() => toast({ title: "Contact your admin", description: "Password resets are handled by the workspace owner." })}
                  className="font-body text-sm text-white/60 hover:text-white transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>
        </div>

        <p
          className="text-center font-body text-[10px] font-medium text-white/35 mt-6 uppercase"
          style={{ letterSpacing: "0.28em" }}
        >
          Field Ops Platform · Multi-Business Operations
        </p>
      </div>
    </div>
  );
}
