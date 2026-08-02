import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBusinesses from "./tools/list-businesses";
import listLeads from "./tools/list-leads";
import createLead from "./tools/create-lead";
import searchCustomers from "./tools/search-customers";
import listJobs from "./tools/list-jobs";
import listUnpaidInvoices from "./tools/list-unpaid-invoices";
import listYearlyTrimmingClients from "./tools/list-yearly-trimming-clients";

// Issuer must be the direct Supabase host, built from the project ref literal
// Vite inlines at build time (never from SUPABASE_URL, which may be a proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gulf-coast-palms",
  title: "Gulf Coast Palms",
  version: "0.1.0",
  instructions:
    "Tools for the Gulf Coast Palms field-service platform. Start with `list_businesses` to get the business_id for the tenant you are working in, then read leads, customers, jobs, unpaid invoices, and the yearly-trimming roster. `create_lead` adds a new inbound lead. All data is scoped to the signed-in user's access.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listBusinesses,
    listLeads,
    createLead,
    searchCustomers,
    listJobs,
    listUnpaidInvoices,
    listYearlyTrimmingClients,
  ],
});