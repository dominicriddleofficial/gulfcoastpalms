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
    console.error("Jobber GraphQL HTTP error:", res.status, text);
    throw new Error(`Jobber API returned ${res.status}: ${text.slice(0, 200)}`);
  }

  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("Jobber returned non-JSON:", text.slice(0, 300));
    throw new Error("Jobber returned non-JSON response");
  }

  if (body.errors?.length) {
    console.error("Jobber GraphQL errors:", JSON.stringify(body.errors));
    throw new Error(body.errors[0]?.message || "Jobber GraphQL error");
  }

  if (!body.data) {
    console.error("Jobber response missing data:", JSON.stringify(body).slice(0, 300));
    throw new Error("Jobber response missing data field");
  }

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

    if (!connection?.nodes) {
      console.log(`No nodes for ${rootField}`);
      break;
    }

    allNodes.push(...connection.nodes);
    hasNextPage = connection.pageInfo?.hasNextPage ?? false;
    cursor = connection.pageInfo?.endCursor ?? null;

    // Respect Jobber rate limits
    if (hasNextPage) await new Promise((r) => setTimeout(r, 1000));
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
        visits(first: 5) {
          nodes {
            id
            title
            startAt
            endAt
            visitStatus
            isComplete
            assignedUsers { nodes { id firstName lastName } }
          }
        }
        instructions
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: tokenRow } = await supabase
    .from("jobber_tokens")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    return jsonResponse({ error: "Jobber not connected. Connect first in Settings." }, 400);
  }

  let accessToken = tokenRow.access_token;

  // Auto-refresh if expired
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
      const errBody = await refreshRes.text();
      console.error("Token refresh failed during sync:", errBody);
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

  // Create sync log
  const { data: syncLog } = await supabase
    .from("sync_logs")
    .insert({ sync_type: "full", status: "running" })
    .select("id")
    .single();

  const syncLogId = syncLog?.id;
  let totalRecords = 0;

  try {
    // ---- Clients ----
    console.log("Syncing clients...");
    const clients = (await fetchAllPages(accessToken, CLIENTS_QUERY, "clients")) as any[];
    const clientIdMap: Record<string, string> = {};

    for (const c of clients) {
      const primaryEmail = c.emails?.find((e: any) => e.primary)?.address || c.emails?.[0]?.address || null;
      const primaryPhone = c.phones?.find((p: any) => p.primary)?.number || c.phones?.[0]?.number || null;
      const tags = c.tags?.nodes?.map((t: any) => t.label) || null;

      const { data: upserted } = await supabase
        .from("jobber_clients")
        .upsert(
          {
            jobber_id: c.id,
            first_name: c.firstName || null,
            last_name: c.lastName || null,
            company_name: c.companyName || null,
            display_name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
            email: primaryEmail,
            phone: primaryPhone,
            tags,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "jobber_id" }
        )
        .select("id")
        .single();

      if (upserted) clientIdMap[c.id] = upserted.id;
      totalRecords++;
    }

    // ---- Properties ----
    console.log("Syncing properties...");
    const properties = (await fetchAllPages(accessToken, PROPERTIES_QUERY, "properties")) as any[];
    const propertyIdMap: Record<string, string> = {};

    for (const p of properties) {
      const addr = p.address || {};
      const clientLocalId = p.client?.id ? clientIdMap[p.client.id] || null : null;

      const { data: upserted } = await supabase
        .from("jobber_properties")
        .upsert(
          {
            jobber_id: p.id,
            street1: addr.street1 || null,
            street2: addr.street2 || null,
            city: addr.city || null,
            state: addr.province || null,
            zip: addr.postalCode || null,
            country: addr.country || "US",
            client_id: clientLocalId,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "jobber_id" }
        )
        .select("id")
        .single();

      if (upserted) propertyIdMap[p.id] = upserted.id;
      totalRecords++;
    }

    // ---- Jobs ----
    console.log("Syncing jobs...");
    const jobs = (await fetchAllPages(accessToken, JOBS_QUERY, "jobs")) as any[];

    for (const j of jobs) {
      const clientLocalId = j.client?.id ? clientIdMap[j.client.id] || null : null;
      const propLocalId = j.property?.id ? propertyIdMap[j.property.id] || null : null;
      const clientPhone = j.client?.phones?.find((p: any) => p.primary)?.number || j.client?.phones?.[0]?.number || null;

      const lineItems =
        j.lineItems?.nodes?.map((li: any) => ({
          name: li.name || li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })) || [];

      const latestVisit = j.visits?.nodes?.[0];

      const assignedNames =
        latestVisit?.assignedUsers?.nodes?.map(
          (m: any) => `${m.firstName || ""} ${m.lastName || ""}`.trim()
        ) || [];

      const assignedIds = latestVisit?.assignedUsers?.nodes?.map((m: any) => m.id) || [];

      const propAddr = j.property?.address;
      const addressStr = propAddr
        ? [propAddr.street1, propAddr.city, propAddr.province, propAddr.postalCode].filter(Boolean).join(", ")
        : null;

      await supabase.from("jobber_jobs").upsert(
        {
          jobber_id: j.id,
          job_number: j.jobNumber?.toString() || null,
          title: j.title || null,
          status: j.jobStatus?.toLowerCase() || "scheduled",
          visit_status: latestVisit?.visitStatus?.toLowerCase() || "scheduled",
          scheduled_start: latestVisit?.startAt || null,
          scheduled_end: latestVisit?.endAt || null,
          client_id: clientLocalId,
          client_name: j.client?.name || null,
          client_phone: clientPhone,
          property_id: propLocalId,
          property_address: addressStr,
          assigned_employee_names: assignedNames.length ? assignedNames : null,
          assigned_employee_ids: assignedIds.length ? assignedIds : null,
          service_items: lineItems.length ? lineItems : [],
          total_amount: j.total || 0,
          internal_notes: j.instructions || null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "jobber_id" }
      );

      totalRecords++;
    }

    // Mark sync complete
    if (syncLogId) {
      await supabase
        .from("sync_logs")
        .update({
          status: "success",
          records_synced: totalRecords,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    console.log(`Sync complete: ${totalRecords} records`);

    return jsonResponse({
      success: true,
      records_synced: totalRecords,
      breakdown: { clients: clients.length, properties: properties.length, jobs: jobs.length },
    });
  } catch (error) {
    console.error("Sync failed:", error);

    if (syncLogId) {
      await supabase
        .from("sync_logs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return jsonResponse(
      { error: "Sync failed", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
});