import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JOBBER_GRAPHQL = "https://api.getjobber.com/api/graphql";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function jobberQuery(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
) {
  const res = await fetch(JOBBER_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jobber API returned ${res.status}: ${text.slice(0, 200)}`);
  }

  let body: any;
  try { body = JSON.parse(text); } catch {
    throw new Error("Jobber returned non-JSON response");
  }

  if (body.errors?.length) {
    console.error("Jobber GQL errors:", JSON.stringify(body.errors));
    throw new Error(body.errors[0]?.message || "Jobber GraphQL error");
  }

  if (!body.data) throw new Error("Jobber response missing data field");
  return body.data;
}

async function fetchAllPages(
  accessToken: string,
  query: string,
  rootField: string,
  limit = 50
) {
  let cursor: string | null = null;
  let hasNextPage = true;
  const allNodes: unknown[] = [];

  while (hasNextPage) {
    const variables: Record<string, unknown> = { limit };
    if (cursor) variables.cursor = cursor;

    const data = await jobberQuery(accessToken, query, variables);
    const connection = data[rootField];
    if (!connection?.nodes) break;

    allNodes.push(...connection.nodes);
    hasNextPage = connection.pageInfo?.hasNextPage ?? false;
    cursor = connection.pageInfo?.endCursor ?? null;

    if (hasNextPage) await new Promise((r) => setTimeout(r, 200));
  }

  return allNodes;
}

// --- QUERIES: Validated against live Jobber schema ---

const CLIENTS_QUERY = `
  query($limit: Int, $cursor: String) {
    clients(first: $limit, after: $cursor) {
      nodes {
        id
        firstName
        lastName
        companyName
        name
        emails { address primary }
        phones { number primary }
        tags { nodes { label } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PROPERTIES_QUERY = `
  query($limit: Int, $cursor: String) {
    properties(first: $limit, after: $cursor) {
      nodes {
        id
        address { street1 street2 city province postalCode country }
        client { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// User type uses name { full }, NOT firstName/lastName
const JOBS_QUERY = `
  query($limit: Int, $cursor: String) {
    jobs(first: $limit, after: $cursor) {
      nodes {
        id
        jobNumber
        title
        jobStatus
        total
        client { id name phones { number primary } }
        property { id address { street1 city province postalCode } }
        lineItems { nodes { name description quantity unitPrice } }
        visits(first: 5) {
          nodes {
            id title startAt endAt visitStatus isComplete
            assignedUsers { nodes { id name { full } } }
          }
        }
        instructions
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type ModuleResult = {
  module: string;
  success: boolean;
  records: number;
  error?: string;
  timestamp: string;
};

// --- BATCH upsert helper (chunks of 100) ---
async function batchUpsert(supabase: any, table: string, rows: any[], onConflict: string) {
  const CHUNK = 100;
  const allResults: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data } = await supabase
      .from(table)
      .upsert(chunk, { onConflict })
      .select("id, jobber_id");
    if (data) allResults.push(...data);
  }
  return allResults;
}

async function syncClients(accessToken: string, supabase: any): Promise<{ result: ModuleResult; idMap: Record<string, string> }> {
  const ts = new Date().toISOString();
  const clientIdMap: Record<string, string> = {};
  try {
    const clients = (await fetchAllPages(accessToken, CLIENTS_QUERY, "clients")) as any[];
    const rows = clients.map((c: any) => {
      const primaryEmail = c.emails?.find((e: any) => e.primary)?.address || c.emails?.[0]?.address || null;
      const primaryPhone = c.phones?.find((p: any) => p.primary)?.number || c.phones?.[0]?.number || null;
      const tags = c.tags?.nodes?.map((t: any) => t.label) || null;
      return {
        jobber_id: c.id,
        first_name: c.firstName || null,
        last_name: c.lastName || null,
        company_name: c.companyName || null,
        display_name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
        email: primaryEmail,
        phone: primaryPhone,
        tags,
        synced_at: ts,
      };
    });

    const results = await batchUpsert(supabase, "jobber_clients", rows, "jobber_id");
    for (const r of results) {
      if (r.jobber_id && r.id) clientIdMap[r.jobber_id] = r.id;
    }

    console.log(`Clients synced: ${clients.length}`);
    return { result: { module: "clients", success: true, records: clients.length, timestamp: ts }, idMap: clientIdMap };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Sync clients failed:", msg);
    return { result: { module: "clients", success: false, records: 0, error: msg, timestamp: ts }, idMap: clientIdMap };
  }
}

async function syncProperties(accessToken: string, supabase: any, clientIdMap: Record<string, string>): Promise<{ result: ModuleResult; idMap: Record<string, string> }> {
  const ts = new Date().toISOString();
  const propertyIdMap: Record<string, string> = {};
  try {
    const properties = (await fetchAllPages(accessToken, PROPERTIES_QUERY, "properties")) as any[];
    const rows = properties.map((p: any) => {
      const addr = p.address || {};
      return {
        jobber_id: p.id,
        street1: addr.street1 || null,
        street2: addr.street2 || null,
        city: addr.city || null,
        state: addr.province || null,
        zip: addr.postalCode || null,
        country: addr.country || "US",
        client_id: p.client?.id ? clientIdMap[p.client.id] || null : null,
        synced_at: ts,
      };
    });

    const results = await batchUpsert(supabase, "jobber_properties", rows, "jobber_id");
    for (const r of results) {
      if (r.jobber_id && r.id) propertyIdMap[r.jobber_id] = r.id;
    }

    console.log(`Properties synced: ${properties.length}`);
    return { result: { module: "properties", success: true, records: properties.length, timestamp: ts }, idMap: propertyIdMap };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Sync properties failed:", msg);
    return { result: { module: "properties", success: false, records: 0, error: msg, timestamp: ts }, idMap: propertyIdMap };
  }
}

async function syncJobs(accessToken: string, supabase: any, clientIdMap: Record<string, string>, propertyIdMap: Record<string, string>): Promise<ModuleResult> {
  const ts = new Date().toISOString();
  try {
    const jobs = (await fetchAllPages(accessToken, JOBS_QUERY, "jobs")) as any[];
    const rows = jobs.map((j: any) => {
      const clientPhone = j.client?.phones?.find((p: any) => p.primary)?.number || j.client?.phones?.[0]?.number || null;
      const lineItems = j.lineItems?.nodes?.map((li: any) => ({
        name: li.name || li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
      })) || [];

      const latestVisit = j.visits?.nodes?.[0];
      const assignedNames = latestVisit?.assignedUsers?.nodes?.map((m: any) => m.name?.full || "Unknown") || [];
      const assignedIds = latestVisit?.assignedUsers?.nodes?.map((m: any) => m.id) || [];

      const propAddr = j.property?.address;
      const addressStr = propAddr
        ? [propAddr.street1, propAddr.city, propAddr.province, propAddr.postalCode].filter(Boolean).join(", ")
        : null;

      return {
        jobber_id: j.id,
        job_number: j.jobNumber?.toString() || null,
        title: j.title || null,
        status: j.jobStatus?.toLowerCase() || "scheduled",
        visit_status: latestVisit?.visitStatus?.toLowerCase() || "scheduled",
        scheduled_start: latestVisit?.startAt || null,
        scheduled_end: latestVisit?.endAt || null,
        client_id: j.client?.id ? clientIdMap[j.client.id] || null : null,
        client_name: j.client?.name || null,
        client_phone: clientPhone,
        property_id: j.property?.id ? propertyIdMap[j.property.id] || null : null,
        property_address: addressStr,
        assigned_employee_names: assignedNames.length ? assignedNames : null,
        assigned_employee_ids: assignedIds.length ? assignedIds : null,
        service_items: lineItems.length ? lineItems : [],
        total_amount: j.total || 0,
        internal_notes: j.instructions || null,
        synced_at: ts,
      };
    });

    await batchUpsert(supabase, "jobber_jobs", rows, "jobber_id");
    console.log(`Jobs synced: ${jobs.length}`);
    return { module: "jobs", success: true, records: jobs.length, timestamp: ts };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Sync jobs failed:", msg);
    return { module: "jobs", success: false, records: 0, error: msg, timestamp: ts };
  }
}

async function testConnection(accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    await jobberQuery(accessToken, `query { account { name } }`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// --- Main ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let action = "full";
  let modules: string[] = [];
  try {
    const body = await req.json();
    action = body?.action || "full";
    modules = body?.modules || [];
  } catch {}

  const { data: tokenRow } = await supabase
    .from("jobber_tokens")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    return jsonResponse({ error: "Jobber not connected." }, 400);
  }

  let accessToken = tokenRow.access_token;

  // Auto-refresh
  if (new Date(tokenRow.expires_at) < new Date()) {
    const CLIENT_ID = Deno.env.get("JOBBER_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("JOBBER_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return jsonResponse({ error: "Jobber credentials not configured" }, 500);
    }

    const refreshRes = await fetch("https://api.getjobber.com/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: tokenRow.refresh_token,
      }).toString(),
    });

    if (!refreshRes.ok) {
      return jsonResponse({ error: "Token expired and refresh failed" }, 401);
    }

    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;
    const expiresIn = Number(refreshData.expires_in);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    await supabase.from("jobber_tokens").update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      expires_at: expiresAt,
    }).eq("id", tokenRow.id);
  }

  if (action === "test") {
    return jsonResponse(await testConnection(accessToken));
  }

  const syncModules = modules.length > 0 ? modules : ["clients", "properties", "jobs"];

  const { data: syncLog } = await supabase
    .from("sync_logs")
    .insert({ sync_type: syncModules.join(","), status: "running" })
    .select("id")
    .single();
  const syncLogId = syncLog?.id;

  const results: ModuleResult[] = [];
  let clientIdMap: Record<string, string> = {};
  let propertyIdMap: Record<string, string> = {};

  if (syncModules.includes("clients")) {
    console.log("Syncing clients...");
    const r = await syncClients(accessToken, supabase);
    results.push(r.result);
    clientIdMap = r.idMap;
  }

  if (syncModules.includes("properties")) {
    console.log("Syncing properties...");
    const r = await syncProperties(accessToken, supabase, clientIdMap);
    results.push(r.result);
    propertyIdMap = r.idMap;
  }

  if (syncModules.includes("jobs")) {
    console.log("Syncing jobs...");
    results.push(await syncJobs(accessToken, supabase, clientIdMap, propertyIdMap));
  }

  const totalRecords = results.reduce((sum, r) => sum + r.records, 0);
  const allSuccess = results.every((r) => r.success);
  const failedModules = results.filter((r) => !r.success);
  const finalStatus = allSuccess ? "success" : failedModules.length === results.length ? "failed" : "partial";
  const errorMessages = failedModules.map((f) => `${f.module}: ${f.error}`).join("; ");

  if (syncLogId) {
    await supabase.from("sync_logs").update({
      status: finalStatus,
      records_synced: totalRecords,
      error_message: errorMessages || null,
      completed_at: new Date().toISOString(),
    }).eq("id", syncLogId);
  }

  console.log(`Sync ${finalStatus}: ${totalRecords} records`);

  return jsonResponse({
    success: allSuccess,
    status: finalStatus,
    records_synced: totalRecords,
    modules: results,
    breakdown: {
      clients: results.find((r) => r.module === "clients")?.records || 0,
      properties: results.find((r) => r.module === "properties")?.records || 0,
      jobs: results.find((r) => r.module === "jobs")?.records || 0,
    },
  });
});
