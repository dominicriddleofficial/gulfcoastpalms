import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

export default function PlatformChangePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/platform/login", { replace: true });
        return;
      }
      setUserId(data.user.id);
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error: profErr } = await supabase
      .from("platform_user_profiles")
      .update({ must_change_password: false })
      .eq("user_id", userId);
    if (profErr) {
      toast({ title: "Password updated, but flag failed", description: profErr.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
    }
    setSaving(false);
    navigate("/platform", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-card/80 border border-border rounded-2xl p-6 space-y-5 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-[18px] font-semibold tracking-tight">Set a new password</h1>
            <p className="font-body text-[12px] text-muted-foreground">Required before you can continue.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw2">Confirm password</Label>
          <Input id="pw2" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}