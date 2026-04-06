import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { AlertTriangle, Trash2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ErrorLog {
  id: string;
  error_message: string | null;
  error_stack: string | null;
  component_stack: string | null;
  page_url: string | null;
  user_agent: string | null;
  created_at: string;
  resolved: boolean;
}

export default function AdminErrors() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    const { data } = await supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setErrors((data as ErrorLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 60000);
    return () => clearInterval(interval);
  }, [fetchErrors]);

  const toggleResolved = async (id: string, resolved: boolean) => {
    await supabase.from("error_logs").update({ resolved }).eq("id", id);
    setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, resolved } : e)));
  };

  const clearResolved = async () => {
    await supabase.from("error_logs").delete().eq("resolved", true);
    setErrors((prev) => prev.filter((e) => !e.resolved));
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const recentErrors = errors.filter((e) => new Date(e.created_at) >= sevenDaysAgo);
  const unresolvedCount = errors.filter((e) => !e.resolved).length;

  return (
    <AdminLayout>
      <SEOHead title="Error Logs | Admin" description="View application error logs" noIndex />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Error Logs</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchErrors}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={clearResolved} disabled={!errors.some((e) => e.resolved)}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear Resolved
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-body text-xs text-muted-foreground">Last 7 Days</p>
            <p className="font-display text-2xl font-bold text-foreground">{recentErrors.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-body text-xs text-muted-foreground">Unresolved</p>
            <p className="font-display text-2xl font-bold text-destructive">{unresolvedCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-body text-xs text-muted-foreground">Most Recent</p>
            <p className="font-body text-sm text-foreground">
              {errors[0] ? formatDistanceToNow(new Date(errors[0].created_at), { addSuffix: true }) : "None"}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="font-body text-muted-foreground text-center py-12">Loading...</p>
        ) : errors.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-muted-foreground">No errors logged yet — that's a good thing!</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {errors.map((err) => (
                <div key={err.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                  >
                    {expandedId === err.id ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-foreground truncate">
                        {err.error_message?.slice(0, 80) || "Unknown error"}
                        {(err.error_message?.length || 0) > 80 && "..."}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                        {err.page_url && ` · ${err.page_url}`}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={err.resolved}
                        onCheckedChange={(checked) => toggleResolved(err.id, !!checked)}
                        aria-label="Mark as resolved"
                      />
                    </div>
                  </div>
                  {expandedId === err.id && (
                    <div className="px-4 pb-4 space-y-3 bg-secondary/30">
                      {err.error_message && (
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground mb-1">Error Message</p>
                          <pre className="font-mono text-xs text-foreground bg-background p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{err.error_message}</pre>
                        </div>
                      )}
                      {err.error_stack && (
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground mb-1">Stack Trace</p>
                          <pre className="font-mono text-xs text-foreground bg-background p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">{err.error_stack}</pre>
                        </div>
                      )}
                      {err.component_stack && (
                        <div>
                          <p className="font-body text-xs font-semibold text-muted-foreground mb-1">Component Stack</p>
                          <pre className="font-mono text-xs text-foreground bg-background p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">{err.component_stack}</pre>
                        </div>
                      )}
                      {err.user_agent && (
                        <p className="font-body text-xs text-muted-foreground">
                          <span className="font-semibold">User Agent:</span> {err.user_agent}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
