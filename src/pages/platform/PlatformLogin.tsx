import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function PlatformLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <div className="ops-theme min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <Card className="border-border bg-card shadow-2xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-foreground font-display text-xl font-bold">FS</span>
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
