import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async () => {
  const key = Deno.env.get("SIMPLETEXTING_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "no key" }), { status: 500 });
  const to = "+18508897255";
  const body = "GCP LEAD ALERTS 🌴 Save this number. Every new website lead texts you from here automatically — name, phone, service + the customer's message. When one hits: reach out and book ASAP. Speed wins the job.";
  await fetch("https://api-app2.simpletexting.com/v2/api/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone: to }),
  }).catch(() => null);
  const res = await fetch("https://api-app2.simpletexting.com/v2/api/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contactPhone: to, mode: "AUTO", text: body }),
  });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ status: res.status, data }, null, 2), { headers: { "Content-Type": "application/json" } });
});
