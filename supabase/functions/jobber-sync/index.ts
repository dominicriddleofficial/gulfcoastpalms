import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JOBBER_GRAPHQL = "https://api.getjobber.com/api/graphql";
const JOBBER_GRAPHQL_VERSION = "2026-03-10";
const MODULE_SEQUENCE = ["clients", "properties", "users", "jobs", "visits"] as const;
const MODULE_LABELS: Record<string, string> = {
  clients: "Clients",
  properties: "Properties",
  users: "Crew",
  jobs: "Jobs",
  visits: "Schedule",
};
const OVERLAP_MINUTES = 15;
const DEFAULT_PAGE_DELAY_MS = 350;
const MODULE_DELAY_MS = 900;
const THROTTLE_BUFFER = 300;
const THROTTLE_RETRY_LIMIT = 1;
const DRY_RUN_PAGE_LIMIT = 1;

type ModuleName = (typeof MODULE_SEQUENCE)[number];

type ThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
};

type QueryMeta = {
  requestedCost: number | null;
  actualCost: number | null;
  throttleStatus: ThrottleStatus | null;
  versionWarning: string | null;
};

type QueryResult<T> = {
  data: T;
  meta: QueryMeta;
};

type ModuleResult = {
  module: ModuleName;
  success: boolean;
  records: number;
  error?: string;
  timestamp: string;
  queryName: string;
  incremental: boolean;
  lastSuccessAt?: string | null;
  requestedCost?: number | null;
  actualCost?: number | null;
  currentlyAvailable?: number | null;
  restoreRate?: number | null;
};

type SyncContext = {
  lastMeta: QueryMeta | null;
  dryRun: boolean;
};

type ConnectionPageOptions = {
  limit: number;
  pageDelayMs?: number;
  maxPages?: number;
  expectedCost?: number;
};

type ConnectionResult<T> = {
  nodes: T[];
  meta: QueryMeta;
};

type ModuleRunResult<T = undefined> = {
  result: ModuleResult;
  payload?: T;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIso(date: Date) {
  return date.toISOString();
}

function subtractMinutes(iso: string, minutes: number) {
  return toIso(new Date(new Date(iso).getTime() - minutes * 60 * 1000));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function formatPropertyAddress(address?: { street1?: string | null; city?: string | null; province?: string | null; postalCode?: string | null } | null) {
  if (!address) return null;
  return [address.street1, address.city, address.province, address.postalCode].filter(Boolean).join(", ") || null;
}

function normalizeModuleName(module: string): ModuleName | null {
  return (MODULE_SEQUENCE as readonly string[]).includes(module) ? (module as ModuleName) : null;
}

function parseQueryMeta(body: any): QueryMeta {
  const cost = body?.extensions?.cost;
  const throttle = cost?.throttleStatus;

  return {
    requestedCost: typeof cost?.requestedQueryCost === "number" ? cost.requestedQueryCost : null,
    actualCost: typeof cost?.actualQueryCost === "number" ? cost.actualQueryCost : null,
    throttleStatus: throttle
      ? {
          maximumAvailable: Number(throttle.maximumAvailable || 0),
          currentlyAvailable: Number(throttle.currentlyAvailable || 0),
          restoreRate: Number(throttle.restoreRate || 0),
        }
      : null,
    versionWarning: body?.extensions?.versioning?.warning || null,
  };
}

function isThrottleError(status: number, body: any) {
  const message = body?.errors?.[0]?.message || "";
  return status === 429 || /throttled/i.test(message);
}

function calculateThrottleWaitMs(meta: QueryMeta, expectedCost: number) {
  const throttle = meta.throttleStatus;
  if (!throttle) return 5000;

  const target = Math.max(expectedCost + THROTTLE_BUFFER, THROTTLE_BUFFER * 2);
  const deficit = target - throttle.currentlyAvailable;
  if (deficit <= 0) return 0;

  const restoreRate = throttle.restoreRate > 0 ? throttle.restoreRate : 250;
  return Math.ceil(deficit / restoreRate) * 1000 + 1000;
}

async function maybeWaitForBudget(context: SyncContext, expectedCost: number) {
  const throttle = context.lastMeta?.throttleStatus;
  if (!throttle) return;

  const waitMs = calculateThrottleWaitMs(context.lastMeta!, expectedCost);
  if (waitMs > 0) {
    console.log(`Waiting ${waitMs}ms for Jobber throttle budget to recover`);
    await sleep(waitMs);
  }
}

async function jobberQuery<T>(
  accessToken: string,
  queryName: string,
  query: string,
  variables: Record<string, unknown>,
  context: SyncContext,
  expectedCost = 25
): Promise<QueryResult<T>> {
  await maybeWaitForBudget(context, expectedCost);

  let throttleRetries = 0;

  while (true) {
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

    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`${queryName}: Jobber returned a non-JSON response`);
    }

    const meta = parseQueryMeta(body);
    context.lastMeta = meta;

    if (isThrottleError(res.status, body)) {
      const waitMs = calculateThrottleWaitMs(meta, expectedCost || meta.requestedCost || 25);
      const errorMessage = body?.errors?.[0]?.message || `Jobber API returned ${res.status}`;

      if (throttleRetries < THROTTLE_RETRY_LIMIT && waitMs > 0) {
        throttleRetries += 1;
        console.log(`${queryName} throttled, waiting ${waitMs}ms before retry`);
        await sleep(waitMs);
        continue;
      }

      throw new Error(`Rate limit hit after controlled retry: ${errorMessage}`);
    }

    if (!res.ok) {
      console.error("Jobber GraphQL HTTP error:", res.status, text);
      throw new Error(`${queryName}: Jobber API returned ${res.status}`);
    }

    if (body?.errors?.length) {
      console.error("Jobber GraphQL errors:", JSON.stringify(body.errors));
      throw new Error(`${queryName}: ${body.errors[0]?.message || "GraphQL error"}`);
    }

    if (!body?.data) {
      throw new Error(`${queryName}: Jobber response missing data`);
    }

    return { data: body.data as T, meta };
  }
}

async function fetchConnectionPages<T>(
  accessToken: string,
  queryName: string,
  query: string,
  rootField: string,
  baseVariables: Record<string, unknown>,
  context: SyncContext,
  options: ConnectionPageOptions
): Promise<ConnectionResult<T>> {
  let cursor: string | null = null;
  let hasNextPage = true;
  const nodes: T[] = [];
  let pageCount = 0;
  let lastMeta: QueryMeta = {
    requestedCost: null,
    actualCost: null,
    throttleStatus: null,
    versionWarning: null,
  };

  while (hasNextPage) {
    const variables = { ...baseVariables, limit: options.limit, cursor };
    const { data, meta } = await jobberQuery<Record<string, any>>(accessToken, queryName, query, variables, context, options.expectedCost);
    lastMeta = meta;

    const connection = data[rootField];
    if (!connection?.nodes) break;

    nodes.push(...connection.nodes);
    hasNextPage = connection.pageInfo?.hasNextPage ?? false;
    cursor = connection.pageInfo?.endCursor ?? null;
    pageCount += 1;

    if (options.maxPages && pageCount >= options.maxPages) {
      break;
    }

    if (hasNextPage) {
      await sleep(options.pageDelayMs ?? DEFAULT_PAGE_DELAY_MS);
    }
  }

  return { nodes, meta: lastMeta };
}

async function fetchAllTableRows(supabase: any, table: string, columns: string) {
  const pageSize = 1000;
  let from = 0;
  const rows: any[] = [];

  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function loadClientCache(supabase: any) {
  const rows = await fetchAllTableRows(supabase, "jobber_clients", "id, jobber_id, phone, display_name");
  const byJobberId: Record<string, { id: string; phone: string | null; display_name: string | null }> = {};

  for (const row of rows) {
    byJobberId[row.jobber_id] = { id: row.id, phone: row.phone ?? null, display_name: row.display_name ?? null };
  }

  return byJobberId;
}

async function loadPropertyCache(supabase: any) {
  const rows = await fetchAllTableRows(supabase, "jobber_properties", "id, jobber_id, street1, city, state, zip");
  const byJobberId: Record<string, { id: string; address: string | null }> = {};

  for (const row of rows) {
    byJobberId[row.jobber_id] = {
      id: row.id,
      address: [row.street1, row.city, row.state, row.zip].filter(Boolean).join(", ") || null,
    };
  }

  return byJobberId;
}

async function batchUpsert(supabase: any, table: string, rows: Record<string, unknown>[], onConflict: string) {
  if (!rows.length) return;
  const chunkSize = 100;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function createSyncLog(supabase: any, syncType: string) {
  const { data, error } = await supabase.from("sync_logs").insert({ sync_type: syncType, status: "running" }).select("id").single();
  if (error) throw new Error(`Failed to create sync log: ${error.message}`);
  return data.id as string;
}

async function finalizeSyncLog(supabase: any, logId: string, result: { status: string; records: number; error?: string | null }) {
  await supabase
    .from("sync_logs")
    .update({
      status: result.status,
      records_synced: result.records,
      error_message: result.error || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);
}

async function getLastModuleSuccessAt(supabase: any, module: ModuleName) {
  const { data } = await supabase
    .from("sync_logs")
    .select("completed_at")
    .eq("sync_type", module)
    .eq("status", "success")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.completed_at || null;
}

function buildClientsFilter(lastSuccessAt: string | null) {
  if (!lastSuccessAt) return null;
  return { updatedAt: { after: subtractMinutes(lastSuccessAt, OVERLAP_MINUTES) } };
}

function buildOpsWindow(lastSuccessAt: string | null, fallbackPastDays: number, futureDays: number) {
  const now = new Date();
  const fallbackAfter = toIso(addDays(now, -fallbackPastDays));
  const incrementalAfter = lastSuccessAt ? subtractMinutes(lastSuccessAt, OVERLAP_MINUTES) : fallbackAfter;
  return {
    after: incrementalAfter < fallbackAfter ? incrementalAfter : fallbackAfter,
    before: toIso(addDays(now, futureDays)),
  };
}

function mapModuleMeta(module: ModuleName, queryName: string, meta: QueryMeta, records: number, incremental: boolean, lastSuccessAt: string | null): ModuleResult {
  return {
    module,
    success: true,
    records,
    timestamp: new Date().toISOString(),
    queryName,
    incremental,
    lastSuccessAt,
    requestedCost: meta.requestedCost,
    actualCost: meta.actualCost,
    currentlyAvailable: meta.throttleStatus?.currentlyAvailable ?? null,
    restoreRate: meta.throttleStatus?.restoreRate ?? null,
  };
}

const CLIENTS_QUERY = `
  query SyncClients($limit: Int, $cursor: String, $filter: ClientFilterAttributes) {
    clients(first: $limit, after: $cursor, filter: $filter) {
      nodes {
        id
        firstName
        lastName
        companyName
        name
        emails(first: 1) { nodes { address } }
        phones(first: 1) { nodes { number } }
        tags(first: 5) { nodes { label } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const CLIENT_IDS_QUERY = `
  query SyncClientIds($limit: Int, $cursor: String, $filter: ClientFilterAttributes) {
    clients(first: $limit, after: $cursor, filter: $filter) {
      nodes { id }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PROPERTIES_QUERY = `
  query SyncProperties($limit: Int, $cursor: String, $filter: PropertiesFilterAttributes) {
    properties(first: $limit, after: $cursor, filter: $filter) {
      nodes {
        id
        client { id }
        address {
          street1
          street2
          city
          province
          postalCode
          country
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const USERS_QUERY = `
  query SyncUsers($limit: Int, $cursor: String) {
    users(first: $limit, after: $cursor) {
      nodes {
        id
        name { full }
        email { raw }
        status
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const JOBS_QUERY = `
  query SyncJobs($limit: Int, $cursor: String, $filter: JobFilterAttributes) {
    jobs(first: $limit, after: $cursor, filter: $filter) {
      nodes {
        id
        jobNumber
        title
        jobStatus
        total
        instructions
        client { id name }
        property { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const VISITS_QUERY = `
  query SyncVisits($limit: Int, $cursor: String, $filter: VisitFilterAttributes) {
    visits(first: $limit, after: $cursor, filter: $filter) {
      nodes {
        id
        title
        startAt
        endAt
        visitStatus
        isComplete
        instructions
        job { id }
        client { id name }
        property {
          id
          address {
            street1
            city
            province
            postalCode
          }
        }
        assignedUsers(first: 5) {
          nodes {
            id
            name { full }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function pickPrimaryEmail(emails: Array<{ address?: string | null; primary?: boolean }> | null | undefined) {
  return emails?.find((item) => item.primary)?.address || emails?.[0]?.address || null;
}

function pickPrimaryPhone(phones: Array<{ number?: string | null; primary?: boolean }> | null | undefined) {
  return phones?.find((item) => item.primary)?.number || phones?.[0]?.number || null;
}

async function fetchChangedClientIds(accessToken: string, lastSuccessAt: string | null, context: SyncContext) {
  if (!lastSuccessAt) return null;

  const filter = buildClientsFilter(lastSuccessAt);
  const { nodes } = await fetchConnectionPages<{ id: string }>(
    accessToken,
    "SyncClientIds",
    CLIENT_IDS_QUERY,
    "clients",
    { filter },
    context,
    { limit: 100, pageDelayMs: DEFAULT_PAGE_DELAY_MS, expectedCost: 8 }
  );

  return nodes.map((node) => node.id);
}

async function runClientsModule(accessToken: string, supabase: any, context: SyncContext): Promise<ModuleRunResult<{ changedClientIds: string[] }>> {
  const lastSuccessAt = await getLastModuleSuccessAt(supabase, "clients");
  const filter = buildClientsFilter(lastSuccessAt);
  const { nodes, meta } = await fetchConnectionPages<any>(
    accessToken,
    "SyncClients",
    CLIENTS_QUERY,
    "clients",
    { filter },
    context,
    { limit: 100, pageDelayMs: DEFAULT_PAGE_DELAY_MS, maxPages: context.dryRun ? DRY_RUN_PAGE_LIMIT : undefined, expectedCost: 18 }
  );

  if (!context.dryRun) {
    const syncedAt = new Date().toISOString();
    await batchUpsert(
      supabase,
      "jobber_clients",
      nodes.map((client) => ({
        jobber_id: client.id,
        first_name: client.firstName || null,
        last_name: client.lastName || null,
        company_name: client.companyName || null,
        display_name: client.name || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown",
        email: pickPrimaryEmail(client.emails),
        phone: pickPrimaryPhone(client.phones),
        tags: client.tags?.nodes?.map((tag: any) => tag.label) || null,
        synced_at: syncedAt,
      })),
      "jobber_id"
    );
  }

  return {
    result: mapModuleMeta("clients", "SyncClients", meta, nodes.length, Boolean(lastSuccessAt), lastSuccessAt),
    payload: { changedClientIds: nodes.map((client) => client.id) },
  };
}

async function runPropertiesModule(
  accessToken: string,
  supabase: any,
  context: SyncContext,
  changedClientIds?: string[] | null
): Promise<ModuleRunResult> {
  const lastSuccessAt = await getLastModuleSuccessAt(supabase, "properties");
  const clientCache = await loadClientCache(supabase);
  const targetClientIds = changedClientIds && changedClientIds.length ? changedClientIds : await fetchChangedClientIds(accessToken, lastSuccessAt, context);

  let nodes: any[] = [];
  let finalMeta: QueryMeta = { requestedCost: null, actualCost: null, throttleStatus: null, versionWarning: null };

  if (targetClientIds && targetClientIds.length) {
    for (const clientId of targetClientIds) {
      const result = await fetchConnectionPages<any>(
        accessToken,
        "SyncPropertiesByClient",
        PROPERTIES_QUERY,
        "properties",
        { filter: { clientId } },
        context,
        { limit: 50, pageDelayMs: DEFAULT_PAGE_DELAY_MS, maxPages: context.dryRun ? DRY_RUN_PAGE_LIMIT : undefined, expectedCost: 14 }
      );
      nodes.push(...result.nodes);
      finalMeta = result.meta;
      await sleep(DEFAULT_PAGE_DELAY_MS);
    }
  } else {
    const result = await fetchConnectionPages<any>(
      accessToken,
      "SyncProperties",
      PROPERTIES_QUERY,
      "properties",
      {},
      context,
      { limit: 100, pageDelayMs: DEFAULT_PAGE_DELAY_MS, maxPages: context.dryRun ? DRY_RUN_PAGE_LIMIT : undefined, expectedCost: 14 }
    );
    nodes = result.nodes;
    finalMeta = result.meta;
  }

  const deduped = Array.from(new Map(nodes.map((property) => [property.id, property])).values());

  if (!context.dryRun && deduped.length) {
    const syncedAt = new Date().toISOString();
    await batchUpsert(
      supabase,
      "jobber_properties",
      deduped.map((property) => {
        const address = property.address || {};
        const client = property.client?.id ? clientCache[property.client.id] : null;
        return {
          jobber_id: property.id,
          street1: address.street1 || null,
          street2: address.street2 || null,
          city: address.city || null,
          state: address.province || null,
          zip: address.postalCode || null,
          country: address.country || "US",
          client_id: client?.id || null,
          synced_at: syncedAt,
        };
      }),
      "jobber_id"
    );
  }

  return {
    result: mapModuleMeta("properties", targetClientIds?.length ? "SyncPropertiesByClient" : "SyncProperties", finalMeta, deduped.length, Boolean(lastSuccessAt), lastSuccessAt),
  };
}

async function runUsersModule(accessToken: string, supabase: any, context: SyncContext): Promise<ModuleRunResult> {
  const lastSuccessAt = await getLastModuleSuccessAt(supabase, "users");
  const { nodes, meta } = await fetchConnectionPages<any>(
    accessToken,
    "SyncUsers",
    USERS_QUERY,
    "users",
    {},
    context,
    { limit: 50, pageDelayMs: DEFAULT_PAGE_DELAY_MS, maxPages: context.dryRun ? DRY_RUN_PAGE_LIMIT : undefined, expectedCost: 12 }
  );

  return {
    result: mapModuleMeta("users", "SyncUsers", meta, nodes.length, false, lastSuccessAt),
  };
}

async function runJobsModule(accessToken: string, supabase: any, context: SyncContext): Promise<ModuleRunResult> {
  const lastSuccessAt = await getLastModuleSuccessAt(supabase, "jobs");
  const window = buildOpsWindow(lastSuccessAt, 30, 90);
  const clientCache = await loadClientCache(supabase);
  const propertyCache = await loadPropertyCache(supabase);

  const { nodes, meta } = await fetchConnectionPages<any>(
    accessToken,
    "SyncJobs",
    JOBS_QUERY,
    "jobs",
    { filter: { visitsScheduledBetween: { after: window.after, before: window.before }, includeUnscheduled: false } },
    context,
    { limit: 50, pageDelayMs: DEFAULT_PAGE_DELAY_MS, maxPages: context.dryRun ? DRY_RUN_PAGE_LIMIT : undefined, expectedCost: 20 }
  );

  if (!context.dryRun && nodes.length) {
    const syncedAt = new Date().toISOString();
    await batchUpsert(
      supabase,
      "jobber_jobs",
      nodes.map((job) => {
        const client = job.client?.id ? clientCache[job.client.id] : null;
        const property = job.property?.id ? propertyCache[job.property.id] : null;

        return cleanObject({
          jobber_id: job.id,
          job_number: job.jobNumber?.toString() || null,
          title: job.title || null,
          status: job.jobStatus?.toLowerCase() || "scheduled",
          total_amount: typeof job.total === "number" ? job.total : 0,
          internal_notes: job.instructions || null,
          client_id: client?.id,
          client_name: job.client?.name || client?.display_name || undefined,
          client_phone: client?.phone || undefined,
          property_id: property?.id,
          property_address: property?.address || undefined,
          synced_at: syncedAt,
        });
      }),
      "jobber_id"
    );
  }

  return {
    result: mapModuleMeta("jobs", "SyncJobs", meta, nodes.length, true, lastSuccessAt),
  };
}

function chooseBestVisit(current: any | undefined, nextVisit: any) {
  if (!current) return nextVisit;

  const currentStart = current.startAt ? new Date(current.startAt).getTime() : Number.MAX_SAFE_INTEGER;
  const nextStart = nextVisit.startAt ? new Date(nextVisit.startAt).getTime() : Number.MAX_SAFE_INTEGER;
  const currentIsComplete = Boolean(current.isComplete);
  const nextIsComplete = Boolean(nextVisit.isComplete);

  if (currentIsComplete !== nextIsComplete) {
    return currentIsComplete ? nextVisit : current;
  }

  return nextStart < currentStart ? nextVisit : current;
}

async function runVisitsModule(accessToken: string, supabase: any, context: SyncContext): Promise<ModuleRunResult> {
  const lastSuccessAt = await getLastModuleSuccessAt(supabase, "visits");
  const window = buildOpsWindow(lastSuccessAt, 7, 90);
  const clientCache = await loadClientCache(supabase);
  const propertyCache = await loadPropertyCache(supabase);

  const { nodes, meta } = await fetchConnectionPages<any>(
    accessToken,
    "SyncVisits",
    VISITS_QUERY,
    "visits",
    { filter: { startAt: { after: window.after, before: window.before } } },
    context,
    { limit: 25, pageDelayMs: 1200, maxPages: context.dryRun ? DRY_RUN_PAGE_LIMIT : undefined, expectedCost: 35 }
  );

  const bestVisitByJobId = new Map<string, any>();
  for (const visit of nodes) {
    const jobId = visit.job?.id;
    if (!jobId) continue;
    bestVisitByJobId.set(jobId, chooseBestVisit(bestVisitByJobId.get(jobId), visit));
  }

  if (!context.dryRun && bestVisitByJobId.size) {
    const syncedAt = new Date().toISOString();
    await batchUpsert(
      supabase,
      "jobber_jobs",
      Array.from(bestVisitByJobId.entries()).map(([jobId, visit]) => {
        const client = visit.client?.id ? clientCache[visit.client.id] : null;
        const property = visit.property?.id ? propertyCache[visit.property.id] : null;
        const assignedNames = visit.assignedUsers?.nodes?.map((member: any) => member.name?.full).filter(Boolean) || [];
        const assignedIds = visit.assignedUsers?.nodes?.map((member: any) => member.id).filter(Boolean) || [];

        return cleanObject({
          jobber_id: jobId,
          visit_status: visit.visitStatus?.toLowerCase() || "scheduled",
          scheduled_start: visit.startAt || null,
          scheduled_end: visit.endAt || null,
          client_id: client?.id,
          client_name: visit.client?.name || client?.display_name || undefined,
          property_id: property?.id,
          property_address: formatPropertyAddress(visit.property?.address) || property?.address || undefined,
          assigned_employee_names: assignedNames.length ? assignedNames : undefined,
          assigned_employee_ids: assignedIds.length ? assignedIds : undefined,
          internal_notes: visit.instructions || undefined,
          synced_at: syncedAt,
        });
      }),
      "jobber_id"
    );
  }

  return {
    result: mapModuleMeta("visits", "SyncVisits", meta, nodes.length, true, lastSuccessAt),
  };
}

async function refreshAccessTokenIfNeeded(tokenRow: any, supabase: any) {
  let accessToken = tokenRow.access_token;

  if (new Date(tokenRow.expires_at) >= new Date()) {
    return accessToken;
  }

  const clientId = Deno.env.get("JOBBER_CLIENT_ID");
  const clientSecret = Deno.env.get("JOBBER_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Jobber credentials not configured");
  }

  const refreshRes = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokenRow.refresh_token,
    }).toString(),
  });

  if (!refreshRes.ok) {
    const body = await refreshRes.text();
    console.error("Token refresh failed during sync:", body);
    throw new Error("Token expired and refresh failed");
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

  return accessToken;
}

async function testConnection(accessToken: string, context: SyncContext) {
  const { meta } = await jobberQuery<{ account: { name: string } }>(
    accessToken,
    "TestConnection",
    `query TestConnection { account { name } }`,
    {},
    context,
    5
  );

  return {
    success: true,
    requestedCost: meta.requestedCost,
    actualCost: meta.actualCost,
    currentlyAvailable: meta.throttleStatus?.currentlyAvailable ?? null,
    restoreRate: meta.throttleStatus?.restoreRate ?? null,
  };
}

async function runModule(
  module: ModuleName,
  accessToken: string,
  supabase: any,
  context: SyncContext,
  extra: { changedClientIds?: string[] | null } = {}
): Promise<ModuleRunResult<any>> {
  switch (module) {
    case "clients":
      return runClientsModule(accessToken, supabase, context);
    case "properties":
      return runPropertiesModule(accessToken, supabase, context, extra.changedClientIds);
    case "users":
      return runUsersModule(accessToken, supabase, context);
    case "jobs":
      return runJobsModule(accessToken, supabase, context);
    case "visits":
      return runVisitsModule(accessToken, supabase, context);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const context: SyncContext = { lastMeta: null, dryRun: false };

  let action = "full";
  let modules: ModuleName[] = [];

  try {
    const body = await req.json();
    action = body?.action || "full";
    modules = Array.isArray(body?.modules)
      ? body.modules.map((module: string) => normalizeModuleName(module)).filter(Boolean) as ModuleName[]
      : [];
  } catch {
    // ignore missing body
  }

  context.dryRun = action === "test_query";

  const { data: tokenRow } = await supabase.from("jobber_tokens").select("*").limit(1).maybeSingle();
  if (!tokenRow) {
    return jsonResponse({ error: "Jobber not connected. Connect first in Settings." }, 400);
  }

  try {
    const accessToken = await refreshAccessTokenIfNeeded(tokenRow, supabase);

    if (action === "test") {
      return jsonResponse(await testConnection(accessToken, context));
    }

    const targetModules = modules.length ? modules : [...MODULE_SEQUENCE];
    const overallSyncType = action === "test_query" ? `test:${targetModules.join(",")}` : targetModules.length > 1 ? "full" : targetModules[0];
    const overallLogId = await createSyncLog(supabase, overallSyncType);

    const results: ModuleResult[] = [];
    let changedClientIds: string[] | null = null;

    try {
      for (const module of targetModules) {
        const moduleLogId = await createSyncLog(supabase, action === "test_query" ? `test:${module}` : module);

        try {
          const { result, payload } = await runModule(module, accessToken, supabase, context, { changedClientIds });
          results.push(result);

          if (module === "clients") {
            changedClientIds = payload?.changedClientIds || [];
          }

          await finalizeSyncLog(supabase, moduleLogId, {
            status: result.success ? "success" : "failed",
            records: result.records,
            error: result.error || null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const failedResult: ModuleResult = {
            module,
            success: false,
            records: 0,
            error: message,
            timestamp: new Date().toISOString(),
            queryName: `Sync${MODULE_LABELS[module].replace(/\s+/g, "")}`,
            incremental: module !== "users",
            lastSuccessAt: await getLastModuleSuccessAt(supabase, module),
            requestedCost: context.lastMeta?.requestedCost ?? null,
            actualCost: context.lastMeta?.actualCost ?? null,
            currentlyAvailable: context.lastMeta?.throttleStatus?.currentlyAvailable ?? null,
            restoreRate: context.lastMeta?.throttleStatus?.restoreRate ?? null,
          };
          results.push(failedResult);

          await finalizeSyncLog(supabase, moduleLogId, {
            status: "failed",
            records: 0,
            error: message,
          });
        }

        await sleep(MODULE_DELAY_MS);
      }
    } catch (error) {
      console.error("Sync orchestration failed:", error);
    }

    const recordsSynced = results.reduce((sum, result) => sum + result.records, 0);
    const failedModules = results.filter((result) => !result.success);
    const status = failedModules.length === 0 ? "success" : failedModules.length === results.length ? "failed" : "partial";
    const errorMessage = failedModules.map((result) => `${result.module}: ${result.error}`).join("; ") || null;

    await finalizeSyncLog(supabase, overallLogId, {
      status,
      records: recordsSynced,
      error: errorMessage,
    });

    return jsonResponse({
      success: status === "success",
      status,
      action,
      records_synced: recordsSynced,
      modules: results,
      breakdown: Object.fromEntries(MODULE_SEQUENCE.map((module) => [module, results.find((result) => result.module === module)?.records || 0])),
      throttle: {
        requestedCost: context.lastMeta?.requestedCost ?? null,
        actualCost: context.lastMeta?.actualCost ?? null,
        currentlyAvailable: context.lastMeta?.throttleStatus?.currentlyAvailable ?? null,
        restoreRate: context.lastMeta?.throttleStatus?.restoreRate ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("jobber-sync failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});
