import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Account { user_id: string; email: string; display_name: string; active: boolean }
export default function ManageClimberAccess({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false), [email, setEmail] = useState(""), [name, setName] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [result, setResult] = useState("");
  const qc = useQueryClient();
  const key = ["climber-access", businessId];
  const invoke = async (body: Record<string, unknown>) => {
    const r = await supabase.functions.invoke("manage-climber-access", { body: { ...body, business_id: businessId } });
    if (r.error || r.data?.error) throw new Error(r.data?.error ?? r.error?.message ?? "Could not manage access");
    return r.data;
  };
  const accounts = useQuery({ queryKey: key, enabled: open, queryFn: async () => (await invoke({ action: "list" })).accounts as Account[] });
  const run = async (body: Record<string, unknown>) => {
    if (busy) return; setBusy(true); setError(""); setResult("");
    try { const r = await invoke(body); setPassword(""); setResult(r.created ? "Account created. Share the sign-in address and initial password privately. No invitation was sent." : "Access updated."); await qc.invalidateQueries({ queryKey: key }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save access"); } finally { setBusy(false); }
  };
  return <><Button variant="outline" onClick={() => setOpen(true)}>Manage climber access</Button><Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}><DialogContent className="ops-theme bg-background text-foreground max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Manage climber access</DialogTitle><DialogDescription>Arborist Quotes only · no customer lists, schedule, quotes, or finance access.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void run({ action: "grant", email, ...(name ? { display_name: name } : {}), ...(password ? { password } : {}) }); }}><fieldset disabled={busy} className="space-y-4">
      <label className="block space-y-2 text-sm">Climber email<Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block space-y-2 text-sm">Name (new account)<Input value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block space-y-2 text-sm">Initial password (new account, 12+ characters)<Input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <Button type="submit">{busy ? "Saving…" : "Authorize climber account"}</Button>
    </fieldset></form>
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}{result && <p role="status" className="text-sm">{result}</p>}
    {accounts.isError ? <p role="alert">Couldn't load accounts. <Button variant="outline" onClick={() => accounts.refetch()}>Retry</Button></p> : accounts.data?.map(a => <div key={a.user_id} className="flex flex-wrap justify-between gap-3 border-t border-border pt-3"><div className="min-w-0 break-words text-sm">{a.display_name || a.email}<p className="text-muted-foreground">{a.email} · {a.active ? "Active" : "Disabled"}</p></div>{a.active && <Button variant="outline" disabled={busy} onClick={() => void run({ action: "revoke", user_id: a.user_id })}>Disable access</Button>}</div>)}
  </DialogContent></Dialog></>;
}