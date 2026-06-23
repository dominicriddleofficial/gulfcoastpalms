import { useState } from "react";
import { Download, Database, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { toast } from "sonner";
import {
  EXPORT_REGISTRY,
  downloadCsv,
  downloadEverythingZip,
  type ExportKey,
} from "@/lib/dataExport";

/**
 * Owner-only data export. Lets the workspace owner download every
 * core dataset (customers, properties, jobs, invoices + lines,
 * quotes + lines, payments) for the currently-selected business as
 * CSVs, or all-at-once as a zip. All queries are paginated and
 * scoped by business_id.
 */
export default function DataExportSection() {
  const { isOwner, selectedBusinessId, businesses } = usePlatformAuth();
  const [busyKey, setBusyKey] = useState<ExportKey | "all" | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // Hard gate: owners only.
  if (!isOwner) return null;

  const biz = businesses.find((b) => b.id === selectedBusinessId);
  const businessLabel = biz?.public_brand_name ?? "workspace";

  const runSingle = async (key: ExportKey) => {
    if (!selectedBusinessId) {
      toast.error("Select a business workspace first.");
      return;
    }
    const entry = EXPORT_REGISTRY.find((e) => e.key === key);
    if (!entry) return;
    setBusyKey(key);
    setStatusMsg("");
    try {
      const bundle = await entry.build(selectedBusinessId);
      downloadCsv(bundle.filename, bundle.csv);
      toast.success(`Exported ${bundle.rowCount.toLocaleString()} rows`, {
        description: bundle.filename,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error("Export failed", { description: msg });
    } finally {
      setBusyKey(null);
    }
  };

  const runAll = async () => {
    if (!selectedBusinessId) {
      toast.error("Select a business workspace first.");
      return;
    }
    setBusyKey("all");
    setStatusMsg("Starting export…");
    try {
      const { files } = await downloadEverythingZip(
        selectedBusinessId,
        businessLabel,
        (m) => setStatusMsg(m),
      );
      const total = files.reduce((n, f) => n + f.rows, 0);
      toast.success(`Exported ${files.length} files, ${total.toLocaleString()} rows`, {
        description: "Zip downloaded.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error("Export failed", { description: msg });
    } finally {
      setBusyKey(null);
      setStatusMsg("");
    }
  };

  const disabled = busyKey !== null || !selectedBusinessId;

  return (
    <div className="platform-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Data Export</h2>
        <span className="text-[10px] font-body px-1.5 py-0.5 rounded-full bg-primary/15 text-primary ml-1">
          Owner only
        </span>
      </div>

      <p className="font-body text-xs text-muted-foreground">
        Download a full CSV backup of <span className="text-foreground font-medium">{businessLabel}</span>.
        Each export pulls the live data for this workspace only. Big tables are streamed in 1,000-row pages.
      </p>

      {!selectedBusinessId && (
        <p className="font-body text-xs text-destructive">
          Select a business workspace to enable exports.
        </p>
      )}

      {/* Export everything */}
      <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-body text-sm text-foreground font-medium flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-primary" />
            Export everything (.zip)
          </p>
          <p className="font-body text-[11px] text-muted-foreground">
            All {EXPORT_REGISTRY.length} datasets bundled as one zip — best for full backups.
          </p>
          {busyKey === "all" && statusMsg && (
            <p className="font-body text-[11px] text-primary mt-1">{statusMsg}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={runAll}
          disabled={disabled}
          className="shrink-0"
        >
          {busyKey === "all" ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Exporting…</>
          ) : (
            <><Download className="w-3.5 h-3.5 mr-1" /> Export all</>
          )}
        </Button>
      </div>

      {/* Per-dataset CSVs */}
      <div className="space-y-2">
        {EXPORT_REGISTRY.map((entry) => {
          const isBusy = busyKey === entry.key;
          return (
            <div
              key={entry.key}
              className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-body text-sm text-foreground font-medium">{entry.label}</p>
                <p className="font-body text-[11px] text-muted-foreground">{entry.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runSingle(entry.key)}
                disabled={disabled}
                className="shrink-0"
              >
                {isBusy ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Exporting…</>
                ) : (
                  <><Download className="w-3.5 h-3.5 mr-1" /> CSV</>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}