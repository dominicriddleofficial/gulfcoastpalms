import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JOBBER_GRAPHQL = "https://api.getjobber.com/api/graphql";
const JOBBER_GRAPHQL_VERSION = "2025-01-20";
const JOBBER_MAX_RETRIES = 6;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number, retryAfterHeader: string | null) {
  const retryAfterSeconds = Number(retryAfterHeader || "0");
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(3000 * 2 ** attempt, 30000);
}

async function jobberQuery(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
) {
  let lastError = "Jobber request failed";

  for (let attempt = 0; attempt < JOBBER_MAX_RETRIES; attempt++) {
    const res = await fetch(JOBBER_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-JOBBER-GRAPHQL-VERSION": JOBBER_GRAPHQL_VERSION,
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await res.text();
    let body: any = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        if (res.ok) {
          throw new Error("Jobber returned non-JSON response");
        }
      }
    }

    const graphQLErrorMessage = body?.errors?.[0]?.message || null;
    const isThrottled = res.status === 429 || /throttled/i.test(graphQLErrorMessage || "");

    if (isThrottled) {
      lastError = graphQLErrorMessage || `Jobber API returned ${res.status}`;

      if (attempt < JOBBER_MAX_RETRIES - 1) {
        const delayMs = getRetryDelayMs(attempt, res.headers.get("retry-after"));
        console.log(`Jobber throttled, retrying in ${delayMs}ms (attempt ${attempt + 1}/${JOBBER_MAX_RETRIES})`);
        await sleep(delayMs);
        continue;
      }

      throw new Error(`Rate limit hit after retries: ${lastError}`);
    }

    if (!res.ok) {
      console.error("Jobber GraphQL HTTP error:", res.status, text);
      throw new Error(`Jobber API returned ${res.status}: ${text.slice(0, 200)}`);
    }

    if (body?.errors?.length) {
      console.error("Jobber GraphQL errors:", JSON.stringify(body.errors));
      throw new Error(graphQLErrorMessage || "Jobber GraphQL error");
    }

    if (!body?.data) {
      console.error("Jobber response missing data:", text.slice(0, 300));
      throw new Error("Jobber response missing data field");
    }

    return body.data;
  }

  throw new Error(lastError);
}

async function fetchAllPages(
  accessToken: string,
  query: string,
  rootField: string,
  limit = 50,
  pageDelayMs = 200
) {
  let cursor: string | null = null;
  let hasNextPage = true;
  const allNodes: unknown[] = [];

  while (hasNextPage) {
    const variables: Record<string, unknown> = { limit };
    if (cursor) variables.cursor = cursor;

    const data = await jobberQuery(accessToken, query, variables);
    const connection = data[rootField];

    if (!connection?.nodes) {
      console.log(`No nodes for ${rootField}`);
      break;
    }

    allNodes.push(...connection.nodes);
    hasNextPage = connection.pageInfo?.hasNextPage ?? false;
    cursor = connection.pageInfo?.endCursor ?? null;

    if (hasNextPage && pageDelayMs > 0) {
      await sleep(pageDelayMs);
    }
  }

  return allNodes;
}

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
        address {
          street1
          street2
          city
          province
          postalCode
          country
        }
        client { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

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
        visits(first: 1) {
          nodes {
            id
            title
            startAt
            endAt
            visitStatus
            isComplete
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

async function batchUpsert(
  supabase: any,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  selectColumns = "id, jobber_id"
) {
  const chunkSize = 100;
  const allResults: any[] = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict })
      .select(selectColumns);

    if (error) {
      throw new Error(`${table} upsert failed: ${error.message}`);
    }

    if (data) {
      allResults.push(...data);
    }
  }

  return allResults;
}

async function loadIdMap(supabase: any, table: string) {
  const idMap: Record<string, string> = {};
  const { data, error } = await supabase.from(table).select("id, jobber_id");

  if (error) {
    throw new Error(`Failed to load ${table} ID map: ${error.message}`);
  }

  for (const row of data || []) {
    if (row.jobber_id && row.id) {
      idMap[row.jobber_id] = row.id;
    }
  }

  return idMap;
}

async function syncClients(accessToken: string, supabase: any): Promise<{ result: ModuleResult; idMap: Record<string, string> }> {
  const ts = new Date().toISOString();
  const clientIdMap: Record<string, string> = {};

  try {
    const clients = (await fetchAllPages(accessToken, CLIENTS_QUERY, "clients", 50, 200)) as any[];

    const rows = clients.map((client: any) => {
      const primaryEmail = client.emails?.find((email: any) => email.primary)?.address || client.emails?.[0]?.address || null;
      const primaryPhone = client.phones?.find((phone: any) => phone.primary)?.number || client.phones?.[0]?.number || null;
      const tags = client.tags?.nodes?.map((tag: any) => tag.label) || null;

      return {
        jobber_id: client.id,
        first_name: client.firstName || null,
        last_name: client.lastName || null,
        company_name: client.companyName || null,
        display_name: client.name || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown",
        email: primaryEmail,
        phone: primaryPhone,
        tags,
        synced_at: ts,
      };
    });

    const results = await batchUpsert(supabase, "jobber_clients", rows, "jobber_id");

    for (const row of results) {
      if (row.jobber_id && row.id) {
        clientIdMap[row.jobber_id] = row.id;
      }
    }

    return {
      result: { module: "clients", success: true, records: clients.length, timestamp: ts },
      idMap: clientIdMap,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync clients failed:", message);

    return {
      result: { module: "clients", success: false, records: 0, error: message, timestamp: ts },
      idMap: clientIdMap,
    };
  }
}

async function syncProperties(
  accessToken: string,
  supabase: any,
  clientIdMap: Record<string, string>
): Promise<{ result: ModuleResult; idMap: Record<string, string> }> {
  const ts = new Date().toISOString();
  const propertyIdMap: Record<string, string> = {};

  try {
    const properties = (await fetchAllPages(accessToken, PROPERTIES_QUERY, "properties", 50, 200)) as any[];

    const rows = properties.map((property: any) => {
      const address = property.address || {};

      return {
        jobber_id: property.id,
        street1: address.street1 || null,
        street2: address.street2 || null,
        city: address.city || null,
        state: address.province || null,
        zip: address.postalCode || null,
        country: address.country || "US",
        client_id: property.client?.id ? clientIdMap[property.client.id] || null : null,
        synced_at: ts,
      };
    });

    const results = await batchUpsert(supabase, "jobber_properties", rows, "jobber_id");

    for (const row of results) {
      if (row.jobber_id && row.id) {
        propertyIdMap[row.jobber_id] = row.id;
      }
    }

    return {
      result: { module: "properties", success: true, records: properties.length, timestamp: ts },
      idMap: propertyIdMap,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync properties failed:", message);

    return {
      result: { module: "properties", success: false, records: 0, error: message, timestamp: ts },
      idMap: propertyIdMap,
    };
  }
}

async function syncJobs(
  accessToken: string,
  supabase: any,
  clientIdMap: Record<string, string>,
  propertyIdMap: Record<string, string>
): Promise<ModuleResult> {
  const ts = new Date().toISOString();

  try {
    const jobs = (await fetchAllPages(accessToken, JOBS_QUERY, "jobs", 20, 1200)) as any[];

    const rows = jobs.map((job: any) => {
      const clientPhone = job.client?.phones?.find((phone: any) => phone.primary)?.number || job.client?.phones?.[0]?.number || null;
      const lineItems = job.lineItems?.nodes?.map((item: any) => ({
        name: item.name || item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })) || [];

      const latestVisit = job.visits?.nodes?.[0];
      const assignedNames = latestVisit?.assignedUsers?.nodes?.map((member: any) => member.name?.full || "Unknown") || [];
      const assignedIds = latestVisit?.assignedUsers?.nodes?.map((member: any) => member.id) || [];

      const propertyAddress = job.property?.address;
      const addressString = propertyAddress
        ? [propertyAddress.street1, propertyAddress.city, propertyAddress.province, propertyAddress.postalCode].filter(Boolean).join(", ")
        : null;

      return {
        jobber_id: job.id,
        job_number: job.jobNumber?.toString() || null,
        title: job.title || null,
        status: job.jobStatus?.toLowerCase() || "scheduled",
        visit_status: latestVisit?.visitStatus?.toLowerCase() || "scheduled",
        scheduled_start: latestVisit?.startAt || null,
        scheduled_end: latestVisit?.endAt || null,
        client_id: job.client?.id ? clientIdMap[job.client.id] || null : null,
        client_name: job.client?.name || null,
        client_phone: clientPhone,
        property_id: job.property?.id ? propertyIdMap[job.property.id] || null : null,
        property_address: addressString,
        assigned_employee_names: assignedNames.length ? assignedNames : null,
        assigned_employee_ids: assignedIds.length ? assignedIds : null,
        service_items: lineItems.length ? lineItems : [],
        total_amount: job.total || 0,
        internal_notes: job.instructions || null,
        synced_at: ts,
      };
    });

    await batchUpsert(supabase, "jobber_jobs", rows, "jobber_id", "id");

    return { module: "jobs", success: true, records: jobs.length, timestamp: ts };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync jobs failed:", message);
    return { module: "jobs", success: false, records: 0, error: message, timestamp: ts };
  }
}

async function testConnection(accessToken: string) {
  try {
    await jobberQuery(accessToken, `query { account { name } }`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

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
  } catch {
    // no request body
  }

  const { data: tokenRow } = await supabase
    .from("jobber_tokens")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    return jsonResponse({ error: "Jobber not connected. Connect first in Settings." }, 400);
  }

  let accessToken = tokenRow.access_token;

  if (new Date(tokenRow.expires_at) < new Date()) {
    const clientId = Deno.env.get("JOBBER_CLIENT_ID");
    const clientSecret = Deno.env.get("JOBBER_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return jsonResponse({ error: "Jobber credentials not configured" }, 500);
    }

    const refreshRes = await fetch("https://api.getjobber.com/api/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: tokenRow.refresh_token,
      }).toString(),
    });

    if (!refreshRes.ok) {
      const refreshBody = await refreshRes.text();
      console.error("Token refresh failed during sync:", refreshBody);
      return jsonResponse({ error: "Token expired and refresh failed" }, 401);
    }

    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;

    const expiresIn = Number(refreshData.expires_in);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    await supabase
      .from("jobber_tokens")
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt,
      })
      .eq("id", tokenRow.id);
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

  try {
    if (syncModules.includes("clients")) {
      console.log("Syncing clients...");
      const clientResult = await syncClients(accessToken, supabase);
      results.push(clientResult.result);
      clientIdMap = clientResult.idMap;
    } else if (syncModules.includes("properties") || syncModules.includes("jobs")) {
      clientIdMap = await loadIdMap(supabase, "jobber_clients");
    }

    if (syncModules.includes("properties")) {
      console.log("Syncing properties...");
      const propertyResult = await syncProperties(accessToken, supabase, clientIdMap);
      results.push(propertyResult.result);
      propertyIdMap = propertyResult.idMap;
    } else if (syncModules.includes("jobs")) {
      propertyIdMap = await loadIdMap(supabase, "jobber_properties");
    }

    if (syncModules.includes("jobs")) {
      console.log("Syncing jobs...");
      results.push(await syncJobs(accessToken, supabase, clientIdMap, propertyIdMap));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync orchestration failed:", message);
    results.push({
      module: "orchestration",
      success: false,
      records: 0,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }

  const totalRecords = results.reduce((sum, result) => sum + result.records, 0);
  const failedModules = results.filter((result) => !result.success);
  const allSuccess = results.length > 0 && failedModules.length === 0;
  const finalStatus = allSuccess ? "success" : failedModules.length === results.length ? "failed" : "partial";
  const errorMessage = failedModules.map((result) => `${result.module}: ${result.error}`).join("; ");

  if (syncLogId) {
    await supabase
      .from("sync_logs")
      .update({
        status: finalStatus,
        records_synced: totalRecords,
        error_message: errorMessage || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLogId);
  }

  return jsonResponse({
    success: allSuccess,
    status: finalStatus,
    records_synced: totalRecords,
    modules: results,
    breakdown: {
      clients: results.find((result) => result.module === "clients")?.records || 0,
      properties: results.find((result) => result.module === "properties")?.records || 0,
      jobs: results.find((result) => result.module === "jobs")?.records || 0,
    },
  });
});
