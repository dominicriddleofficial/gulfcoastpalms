import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

/* ============================================================
 * Data Export helpers
 * - Streams Supabase tables in 1k-row chunks so big tables don't
 *   time out or blow memory in the browser.
 * - Builds CSV strings with proper RFC4180-style escaping.
 * - Scopes every read to a single business_id (workspace).
 * ========================================================== */

const PAGE_SIZE = 1000;

export type Row = Record<string, unknown>;

/** Fetch every row from a table for one business, paginated. */
export async function fetchAllForBusiness<T extends Row = Row>(
  table: string,
  businessId: string,
  options?: { columns?: string; orderBy?: string },
): Promise<T[]> {
  const cols = options?.columns ?? "*";
  const orderBy = options?.orderBy ?? "created_at";
  const out: T[] = [];
  let from = 0;
  // Hard cap to avoid runaway loops if a table is unexpectedly huge.
  const HARD_CAP = 500_000;
  while (out.length < HARD_CAP) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table as never)
      .select(cols)
      .eq("business_id", businessId)
      .order(orderBy, { ascending: true })
      .range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

/** RFC4180-style CSV escape. */
function escapeCell(v: unknown): string {
  if (v == null) return "";
  let s: string;
  if (typeof v === "object") {
    try { s = JSON.stringify(v); } catch { s = String(v); }
  } else {
    s = String(v);
  }
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a CSV string from rows. Column order = union of keys, stable. */
export function rowsToCsv(rows: Row[], columns?: string[]): string {
  if (rows.length === 0 && !columns) return "";
  const headers = columns ?? Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const lines: string[] = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h])).join(","));
  }
  // CRLF per RFC4180 — friendlier to Excel.
  return lines.join("\r\n") + "\r\n";
}

export function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

/* ----------------------- dataset builders ----------------------- */

type Lookup<T> = Map<string, T>;

function indexById<T extends { id: string }>(rows: T[]): Lookup<T> {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return m;
}

export interface ExportBundle {
  filename: string;
  csv: string;
  rowCount: number;
}

function tagsToString(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((x) => String(x)).join("; ");
  return String(v);
}

export async function buildCustomersCsv(businessId: string): Promise<ExportBundle> {
  const rows = await fetchAllForBusiness<Row>("platform_customers", businessId);
  const shaped = rows.map((r) => ({
    id: r.id,
    display_name: r.display_name,
    first_name: r.first_name,
    last_name: r.last_name,
    company_name: r.company_name,
    email: r.email,
    phone: r.phone,
    secondary_phone: r.secondary_phone,
    preferred_contact_method: r.preferred_contact_method,
    customer_status: r.customer_status,
    tags: tagsToString(r.tags),
    vip_flag: r.vip_flag,
    do_not_contact_flag: r.do_not_contact_flag,
    source: r.source,
    referral_source: r.referral_source,
    internal_notes: r.internal_notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return {
    filename: `customers-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

export async function buildPropertiesCsv(businessId: string): Promise<ExportBundle> {
  const [props, customers] = await Promise.all([
    fetchAllForBusiness<Row>("platform_properties", businessId),
    fetchAllForBusiness<{ id: string; display_name: string }>(
      "platform_customers",
      businessId,
      { columns: "id,display_name" },
    ),
  ]);
  const custMap = indexById(customers);
  const shaped = props.map((r) => ({
    id: r.id,
    property_label: r.property_label,
    address_1: r.address_1,
    address_2: r.address_2,
    city: r.city,
    state: r.state,
    zip: r.zip,
    country: r.country,
    formatted_address: r.formatted_address,
    county: r.county,
    latitude: r.latitude,
    longitude: r.longitude,
    property_type: r.property_type,
    gate_code: r.gate_code,
    access_notes: r.access_notes,
    customer_id: r.customer_id,
    customer_name: custMap.get(String(r.customer_id ?? ""))?.display_name ?? "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return {
    filename: `properties-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

function formatPropertyAddress(p: Row | undefined): string {
  if (!p) return "";
  if (p.formatted_address) return String(p.formatted_address);
  const parts = [p.address_1, p.address_2, p.city, p.state, p.zip].filter(Boolean);
  return parts.join(", ");
}

export async function buildJobsCsv(businessId: string): Promise<ExportBundle> {
  const [jobs, customers, properties] = await Promise.all([
    fetchAllForBusiness<Row>("platform_jobs", businessId),
    fetchAllForBusiness<Row & { id: string }>("platform_customers", businessId, {
      columns: "id,display_name,email,phone",
    }),
    fetchAllForBusiness<Row & { id: string }>("platform_properties", businessId, {
      columns: "id,address_1,address_2,city,state,zip,formatted_address",
    }),
  ]);
  const custMap = indexById(customers);
  const propMap = indexById(properties);
  const shaped = jobs.map((r) => {
    const c = custMap.get(String(r.customer_id ?? ""));
    const p = propMap.get(String(r.property_id ?? ""));
    return {
      id: r.id,
      job_number: r.job_number,
      title: r.title,
      status: r.status,
      job_type: r.job_type,
      priority: r.priority,
      scheduled_start: r.scheduled_start,
      scheduled_end: r.scheduled_end,
      subtotal: r.subtotal,
      tax_total: r.tax_total,
      total: r.total,
      deposit_collected: r.deposit_collected,
      customer_id: r.customer_id,
      customer_name: c?.display_name ?? "",
      customer_email: c?.email ?? "",
      customer_phone: c?.phone ?? "",
      property_id: r.property_id,
      property_address: formatPropertyAddress(p),
      tags: tagsToString(r.tags),
      internal_notes: r.internal_notes,
      client_notes: r.client_notes,
      source: r.source,
      source_system: r.source_system,
      created_at: r.created_at,
      completed_at: r.completed_at,
    };
  });
  return {
    filename: `jobs-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

export async function buildInvoicesCsv(businessId: string): Promise<ExportBundle> {
  const [invoices, customers, properties] = await Promise.all([
    fetchAllForBusiness<Row>("platform_invoices", businessId),
    fetchAllForBusiness<Row & { id: string }>("platform_customers", businessId, {
      columns: "id,display_name,email,phone",
    }),
    fetchAllForBusiness<Row & { id: string }>("platform_properties", businessId, {
      columns: "id,address_1,address_2,city,state,zip,formatted_address",
    }),
  ]);
  const custMap = indexById(customers);
  const propMap = indexById(properties);
  const shaped = invoices.map((r) => {
    const c = custMap.get(String(r.customer_id ?? ""));
    const p = propMap.get(String(r.property_id ?? ""));
    return {
      id: r.id,
      invoice_number: r.invoice_number,
      status: r.status,
      issue_date: r.issue_date,
      due_date: r.due_date,
      terms: r.terms,
      subtotal: r.subtotal,
      discount_total: r.discount_total,
      tax_rate: r.tax_rate,
      tax_total: r.tax_total,
      total: r.total,
      amount_paid: r.amount_paid,
      balance_due: r.balance_due,
      deposit_required: r.deposit_required,
      deposit_amount: r.deposit_amount,
      deposit_paid: r.deposit_paid,
      customer_id: r.customer_id,
      customer_name: c?.display_name ?? "",
      customer_email: c?.email ?? "",
      customer_phone: c?.phone ?? "",
      property_id: r.property_id,
      property_address:
        formatPropertyAddress(p) ||
        String(r.service_formatted_address ?? "") ||
        [r.service_address_line1, r.service_city, r.service_state, r.service_zip]
          .filter(Boolean).join(", "),
      job_id: r.job_id,
      quote_id: r.quote_id,
      sent_at: r.sent_at,
      viewed_at: r.viewed_at,
      paid_at: r.paid_at,
      public_notes: r.public_notes,
      created_at: r.created_at,
    };
  });
  return {
    filename: `invoices-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

export async function buildInvoiceLineItemsCsv(businessId: string): Promise<ExportBundle> {
  const [items, invoices] = await Promise.all([
    fetchAllForBusiness<Row & { invoice_id: string }>(
      "platform_invoice_line_items",
      businessId,
    ),
    fetchAllForBusiness<Row & { id: string }>("platform_invoices", businessId, {
      columns: "id,invoice_number",
    }),
  ]);
  const invMap = indexById(invoices);
  const shaped = items
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((r) => ({
      invoice_id: r.invoice_id,
      invoice_number: invMap.get(r.invoice_id)?.invoice_number ?? "",
      sort_order: r.sort_order,
      description: r.description,
      quantity: r.quantity,
      unit: r.unit,
      unit_price: r.unit_price,
      discount_amount: r.discount_amount,
      taxable_flag: r.taxable_flag,
      line_total: r.line_total,
      created_at: r.created_at,
    }));
  return {
    filename: `invoice-line-items-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

export async function buildQuotesCsv(businessId: string): Promise<ExportBundle> {
  const [quotes, customers, properties] = await Promise.all([
    fetchAllForBusiness<Row>("platform_quotes", businessId),
    fetchAllForBusiness<Row & { id: string }>("platform_customers", businessId, {
      columns: "id,display_name,email,phone",
    }),
    fetchAllForBusiness<Row & { id: string }>("platform_properties", businessId, {
      columns: "id,address_1,address_2,city,state,zip,formatted_address",
    }),
  ]);
  const custMap = indexById(customers);
  const propMap = indexById(properties);
  const shaped = quotes.map((r) => {
    const c = custMap.get(String(r.customer_id ?? ""));
    const p = propMap.get(String(r.property_id ?? ""));
    return {
      id: r.id,
      quote_number: r.quote_number,
      status: r.status,
      quote_stage: r.quote_stage,
      subtotal: r.subtotal,
      discount_total: r.discount_total,
      tax_rate: r.tax_rate,
      tax_total: r.tax_total,
      total: r.total,
      deposit_required_flag: r.deposit_required_flag,
      deposit_type: r.deposit_type,
      deposit_value: r.deposit_value,
      deposit_amount_calculated: r.deposit_amount_calculated,
      valid_until: r.valid_until,
      customer_id: r.customer_id,
      customer_name: c?.display_name ?? "",
      customer_email: c?.email ?? "",
      customer_phone: c?.phone ?? "",
      property_id: r.property_id,
      property_address: formatPropertyAddress(p),
      lead_id: r.lead_id,
      scope_of_work: r.scope_of_work,
      public_notes: r.public_notes,
      internal_notes: r.internal_notes,
      sent_at: r.sent_at,
      first_viewed_at: r.first_viewed_at,
      accepted_at: r.accepted_at,
      declined_at: r.declined_at,
      approved_by: r.approved_by,
      approved_at: r.approved_at,
      created_at: r.created_at,
    };
  });
  return {
    filename: `quotes-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

export async function buildQuoteLineItemsCsv(businessId: string): Promise<ExportBundle> {
  const [items, quotes] = await Promise.all([
    fetchAllForBusiness<Row & { quote_id: string }>(
      "platform_quote_line_items",
      businessId,
    ),
    fetchAllForBusiness<Row & { id: string }>("platform_quotes", businessId, {
      columns: "id,quote_number",
    }),
  ]);
  const qMap = indexById(quotes);
  const shaped = items
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((r) => ({
      quote_id: r.quote_id,
      quote_number: qMap.get(r.quote_id)?.quote_number ?? "",
      sort_order: r.sort_order,
      line_type: r.line_type,
      description: r.description,
      quantity: r.quantity,
      unit: r.unit,
      unit_price: r.unit_price,
      discount_amount: r.discount_amount,
      taxable_flag: r.taxable_flag,
      line_total: r.line_total,
      created_at: r.created_at,
    }));
  return {
    filename: `quote-line-items-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

export async function buildPaymentsCsv(businessId: string): Promise<ExportBundle> {
  const [payments, invoices, customers] = await Promise.all([
    fetchAllForBusiness<Row>("platform_payments", businessId),
    fetchAllForBusiness<Row & { id: string }>("platform_invoices", businessId, {
      columns: "id,invoice_number,total",
    }),
    fetchAllForBusiness<Row & { id: string }>("platform_customers", businessId, {
      columns: "id,display_name",
    }),
  ]);
  const invMap = indexById(invoices);
  const custMap = indexById(customers);
  const shaped = payments.map((r) => {
    const inv = invMap.get(String(r.invoice_id ?? ""));
    const c = custMap.get(String(r.customer_id ?? ""));
    return {
      id: r.id,
      payment_number: r.payment_number,
      payment_date: r.payment_date,
      amount: r.amount,
      method: r.method,
      status: r.status,
      is_deposit: r.is_deposit,
      is_refund: r.is_refund,
      reference_number: r.reference_number,
      invoice_id: r.invoice_id,
      invoice_number: inv?.invoice_number ?? "",
      invoice_total: inv?.total ?? "",
      customer_id: r.customer_id,
      customer_name: c?.display_name ?? "",
      notes: r.notes,
      created_at: r.created_at,
    };
  });
  return {
    filename: `payments-${todayStamp()}.csv`,
    csv: rowsToCsv(shaped),
    rowCount: shaped.length,
  };
}

/* ----------------------- registry ----------------------- */

export type ExportKey =
  | "customers"
  | "properties"
  | "jobs"
  | "invoices"
  | "invoice_line_items"
  | "quotes"
  | "quote_line_items"
  | "payments";

export const EXPORT_REGISTRY: ReadonlyArray<{
  key: ExportKey;
  label: string;
  description: string;
  build: (businessId: string) => Promise<ExportBundle>;
}> = [
  { key: "customers",          label: "Customers",           description: "Names, emails, phones, tags, status",                              build: buildCustomersCsv },
  { key: "properties",         label: "Properties",          description: "Service addresses with linked customer",                            build: buildPropertiesCsv },
  { key: "jobs",               label: "Jobs",                description: "All jobs with customer + property + totals",                        build: buildJobsCsv },
  { key: "invoices",           label: "Invoices",            description: "Invoice headers with status, totals, balance",                      build: buildInvoicesCsv },
  { key: "invoice_line_items", label: "Invoice line items",  description: "Every line on every invoice",                                       build: buildInvoiceLineItemsCsv },
  { key: "quotes",             label: "Quotes",              description: "Quote headers with status, totals, customer",                       build: buildQuotesCsv },
  { key: "quote_line_items",   label: "Quote line items",    description: "Every line on every quote",                                         build: buildQuoteLineItemsCsv },
  { key: "payments",           label: "Payments",            description: "Payments with linked invoice + customer",                           build: buildPaymentsCsv },
];

/** Build a zip of every dataset and download it. */
export async function downloadEverythingZip(
  businessId: string,
  businessLabel: string,
  onProgress?: (msg: string) => void,
): Promise<{ files: { name: string; rows: number }[] }> {
  const zip = new JSZip();
  const files: { name: string; rows: number }[] = [];
  for (const entry of EXPORT_REGISTRY) {
    onProgress?.(`Exporting ${entry.label}…`);
    const bundle = await entry.build(businessId);
    zip.file(bundle.filename, bundle.csv);
    files.push({ name: bundle.filename, rows: bundle.rowCount });
  }
  onProgress?.("Building zip…");
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const safeLabel = businessLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  triggerDownload(blob, `${safeLabel}-export-${todayStamp()}.zip`);
  return { files };
}