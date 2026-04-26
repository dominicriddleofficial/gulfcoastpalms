import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import gcpLogo from "@/assets/logo.png";
import ppsLogo from "@/assets/logo-pps.png";

export default function PlatformLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
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
    <div className="ops-theme min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <Card className="border-border bg-card shadow-2xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden p-1.5">
                <img
                  src={gcpLogo}
                  alt="Gulf Coast Palms logo"
                  className="w-full h-full object-contain"
                  width={56}
                  height={56}
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <div className="h-8 w-px bg-border" aria-hidden="true" />
              <div className="w-14 h-14 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden p-1.5">
                <img
                  src={ppsLogo}
                  alt="Prestige Property Services logo"
                  className="w-full h-full object-contain"
                  width={56}
                  height={56}
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>
            <CardTitle className="font-display text-xl text-foreground">Field Ops Platform</CardTitle>
            <p className="font-body text-sm text-primary/70">Multi-Business Operations</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body text-sm text-muted-foreground">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-body text-sm text-muted-foreground">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 bg-secondary border-border text-foreground" />
              </div>
              <Button type="submit" className="w-full h-11 font-body font-semibold" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center font-body text-xs text-muted-foreground">Powered by Field Ops Platform</p>
      </div>
    </div>
  );
}
