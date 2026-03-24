import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

type ImportType = "clients" | "jobs";

const FIELD_MAPS: Record<ImportType, { label: string; description: string }> = {
  clients: { label: "Jobber Clients CSV", description: "Maps: Display Name, First Name, Last Name, Main Phone, E-mails, Service Street/City/State/Zip, Lead Source" },
  jobs: { label: "Jobber Jobs CSV", description: "Maps: Job ID, Customer, Date, Service, City, Revenue, Employee, Status" },
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function mapClientRow(row: Record<string, string>) {
  return {
    jobber_id: row["J-ID"] || null,
    display_name: row["Display Name"] || row["First Name"] || "Unknown",
    first_name: row["First Name"] || null,
    last_name: row["Last Name"] || null,
    company_name: row["Company Name"] || null,
    phone: row["Main Phone #s"] || row["Mobile Phone #s"] || null,
    email: row["E-mails"] || null,
    service_street: row["Service Street 1"] || null,
    service_city: row["Service City"] || null,
    service_state: row["Service State"] || null,
    service_zip: row["Service Post code"] || null,
    tags: row["Tags"] || null,
    lead_source: row["Lead Source"] || null,
  };
}

function mapJobRow(row: Record<string, string>) {
  return {
    jobber_id: row["J-ID"] || row["Job ID"] || null,
    customer_name: row["Customer"] || row["Client Name"] || row["Display Name"] || "Unknown",
    job_date: row["Date"] || row["Completed Date"] || null,
    service_line: row["Service"] || row["Line Item"] || null,
    service_type: row["Service Type"] || null,
    city: row["City"] || row["Service City"] || null,
    revenue: parseFloat(row["Total"] || row["Revenue"] || "0") || 0,
    assigned_employee: row["Employee"] || row["Team"] || null,
    status: row["Status"] || "completed",
  };
}

export default function AdminUploads() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ type: string; success: number; errors: number; total: number } | null>(null);
  const { toast } = useToast();

  const handleUpload = async (type: ImportType) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      setResults(null);

      try {
        const text = await file.text();
        const rows = parseCSV(text);
        let success = 0;
        let errors = 0;

        if (type === "clients") {
          const mapped = rows.map(mapClientRow).filter((r) => r.display_name !== "Unknown");
          // Batch insert in chunks of 50
          for (let i = 0; i < mapped.length; i += 50) {
            const chunk = mapped.slice(i, i + 50);
            const { error } = await supabase.from("clients").insert(chunk);
            if (error) { errors += chunk.length; } else { success += chunk.length; }
          }
        } else if (type === "jobs") {
          const mapped = rows.map(mapJobRow).filter((r) => r.customer_name !== "Unknown");
          for (let i = 0; i < mapped.length; i += 50) {
            const chunk = mapped.slice(i, i + 50);
            const { error } = await supabase.from("jobs").insert(chunk);
            if (error) { errors += chunk.length; } else { success += chunk.length; }
          }
        }

        setResults({ type, success, errors, total: rows.length });
        toast({ title: `Import complete: ${success} records imported` });
      } catch (err) {
        toast({ title: "Import failed", description: "Check the CSV format", variant: "destructive" });
      }
      setImporting(false);
    };
    input.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Upload & Import</h1>
          <p className="font-body text-sm text-muted-foreground">Import Jobber CSV exports into your dashboard</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {(Object.entries(FIELD_MAPS) as [ImportType, { label: string; description: string }][]).map(([type, { label, description }]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="font-body text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-muted-foreground" /> {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-body text-sm text-muted-foreground">{description}</p>
                <Button onClick={() => handleUpload(type)} disabled={importing} className="w-full font-body">
                  <Upload className="w-4 h-4 mr-2" /> {importing ? "Importing..." : `Upload ${label}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {results && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                {results.errors === 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                )}
                <h3 className="font-display text-lg font-bold">Import Results</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <p className="font-body text-2xl font-bold">{results.total}</p>
                  <p className="font-body text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-body text-2xl font-bold text-green-600">{results.success}</p>
                  <p className="font-body text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="font-body text-2xl font-bold text-red-600">{results.errors}</p>
                  <p className="font-body text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="font-body text-sm">Import Notes</CardTitle></CardHeader>
          <CardContent className="space-y-2 font-body text-sm text-muted-foreground">
            <p>• Export your data from Jobber as CSV and upload it here.</p>
            <p>• Client CSVs are automatically mapped using Jobber's field names.</p>
            <p>• Duplicate prevention: records with the same Jobber ID will create new entries. Deduplicate before uploading.</p>
            <p>• For jobs CSV, ensure columns include: Customer/Client Name, Date, Service, City, Total/Revenue.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
