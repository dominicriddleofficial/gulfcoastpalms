import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClimberAccount() {
  const recovery = useLocation().pathname === "/reset-password";
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [current, setCurrent] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [ready, setReady] = useState(!recovery);
  useEffect(() => {
    if (!recovery) return;
    const fromHash = /type=recovery/.test(window.location.hash);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    if (fromHash) void supabase.auth.getUser().then(r => setReady(!r.error && !!r.data.user));
    return () => subscription.unsubscribe();
  }, [recovery]);
  const run = async (action: "reset" | "change") => {
    if (busy) return; setBusy(true); setMessage("");
    try {
      const r = action === "reset" ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        : await supabase.auth.updateUser({ password, ...(!recovery ? { current_password: current } : {}) });
      setMessage(r.error ? r.error.message : action === "reset" ? "Check your email for the recovery link." : "Password updated.");
    } catch { setMessage("Could not update your account. Try again."); } finally { setBusy(false); }
  };
  return <main className="ops-theme min-h-screen bg-background text-foreground p-4 flex justify-center items-center"><section className="max-w-md w-full space-y-5"><h1 className="text-2xl font-semibold">{recovery ? "Reset password" : "My account"}</h1>
    {(!recovery || ready) && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void run("change"); }}>{!recovery && <label className="block space-y-2">Current password<Input type="password" required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} /></label>}<label className="block space-y-2">New password<Input type="password" minLength={12} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><Button disabled={busy}>Update password</Button></form>}
    {recovery && !ready && <p role="alert">Open a valid password recovery link from your email.</p>}
    {!recovery && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void run("reset"); }}><label className="block space-y-2">Account email<Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><Button variant="outline" disabled={busy}>Email recovery link</Button></form>}
    {message && <p role="status" className="text-sm">{message}</p>}<Button variant="ghost" asChild><Link to="/platform/arborist-quotes">Back to Arborist Quotes</Link></Button>
  </section></main>;
}