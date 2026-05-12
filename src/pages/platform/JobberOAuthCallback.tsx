import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

/**
 * Jobber OAuth callback handler. Jobber redirects here with `?code=...`
 * after the user authorizes. We exchange the code via the `jobber-oauth`
 * edge function and then return the user to Settings.
 */
export default function JobberOAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"working" | "ok" | "fail">("working");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const oauthError = params.get("error");
        if (oauthError) throw new Error(oauthError);
        if (!code) throw new Error("Missing authorization code from Jobber.");

        const redirectUri = `${window.location.origin}/platform/integrations/jobber/callback`;
        const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const url = `${projectUrl}/functions/v1/jobber-oauth?action=callback&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "Token exchange failed");
        }

        setStatus("ok");
        toast({ title: "Jobber reconnected", description: "Sync is ready." });
        setTimeout(() => navigate("/platform/settings", { replace: true }), 700);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("fail");
        setErrorMsg(msg);
        toast({ title: "Reconnect failed", description: msg, variant: "destructive" });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
      {status === "working" && (
        <>
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          <p className="font-body text-sm text-foreground">Finishing Jobber reconnect…</p>
        </>
      )}
      {status === "ok" && (
        <>
          <CheckCircle className="w-6 h-6 text-primary" />
          <p className="font-body text-sm text-foreground">Jobber reconnected. Returning to settings…</p>
        </>
      )}
      {status === "fail" && (
        <>
          <XCircle className="w-6 h-6 text-destructive" />
          <p className="font-body text-sm text-foreground">Jobber reconnect failed.</p>
          {errorMsg && <p className="font-body text-xs text-muted-foreground max-w-md">{errorMsg}</p>}
          <button
            className="mt-2 text-xs font-body text-primary underline"
            onClick={() => navigate("/platform/settings", { replace: true })}
          >
            Back to Settings
          </button>
        </>
      )}
    </div>
  );
}