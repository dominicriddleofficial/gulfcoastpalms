import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'bi-weekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semi-annual'
  | 'semiannual'
  | 'annual'
  | 'yearly'

function addInterval(date: Date, frequency: string): Date {
  const d = new Date(date)
  const f = frequency.toLowerCase() as Frequency
  switch (f) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'biweekly':
    case 'bi-weekly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'bimonthly': d.setMonth(d.getMonth() + 2); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'semi-annual':
    case 'semiannual': d.setMonth(d.getMonth() + 6); break
    case 'annual':
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
    default: d.setMonth(d.getMonth() + 1); break
  }
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const today = new Date()
  const todayStr = toDateStr(today)

  const created: Array<{ contract_id: string; job_id: string; job_number: string }> = []
  const errors: Array<{ contract_id: string; error: string }> = []

  const { data: contracts, error } = await supabase
    .from('recurring_contracts')
    .select('*')
    .eq('status', 'active')
    .lte('next_scheduled_date', todayStr)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  for (const c of contracts ?? []) {
    try {
      // Honor end_date
      if (c.end_date && c.end_date < todayStr) {
        if (c.auto_renew) {
          // extend end_date by one year
          const newEnd = new Date(c.end_date)
          newEnd.setFullYear(newEnd.getFullYear() + 1)
          await supabase
            .from('recurring_contracts')
            .update({ end_date: toDateStr(newEnd) })
            .eq('id', c.id)
        } else {
          await supabase
            .from('recurring_contracts')
            .update({ status: 'completed' })
            .eq('id', c.id)
          continue
        }
      }

      // Idempotency: skip if a job already exists for this contract on this date
      const sourceRecordId = `${c.id}:${c.next_scheduled_date}`
      const { data: existing } = await supabase
        .from('platform_jobs')
        .select('id')
        .eq('business_id', c.business_id)
        .eq('source_system', 'recurring_contract')
        .eq('source_record_id', sourceRecordId)
        .maybeSingle()

      let jobId = existing?.id as string | undefined
      let jobNumber = ''

      if (!jobId) {
        const { data: numData, error: numErr } = await supabase.rpc('generate_next_number', {
          _business_id: c.business_id,
          _record_type: 'job',
        })
        if (numErr) throw new Error(`numbering: ${numErr.message}`)
        jobNumber = numData as string

        const title = `${c.service_type} (recurring)`
        const insert = {
          business_id: c.business_id,
          job_number: jobNumber,
          customer_id: c.customer_id,
          title,
          description: `Auto-generated from recurring contract (${c.frequency}).`,
          job_type: 'recurring',
          status: 'scheduled',
          scheduled_start: c.next_scheduled_date,
          scheduled_end: c.next_scheduled_date,
          subtotal: c.price_per_visit,
          total: c.price_per_visit,
          source_system: 'recurring_contract',
          source_record_id: sourceRecordId,
          source_last_synced_at: new Date().toISOString(),
          tags: ['recurring'],
        }
        const { data: job, error: insErr } = await supabase
          .from('platform_jobs')
          .insert(insert)
          .select('id, job_number')
          .single()
        if (insErr) throw new Error(`insert job: ${insErr.message}`)
        jobId = job.id
        jobNumber = job.job_number
      }

      // Advance next_scheduled_date
      const next = addInterval(new Date(c.next_scheduled_date), c.frequency)
      const updates: Record<string, unknown> = { next_scheduled_date: toDateStr(next) }
      if (c.end_date && toDateStr(next) > c.end_date && !c.auto_renew) {
        updates.status = 'completed'
      }
      await supabase.from('recurring_contracts').update(updates).eq('id', c.id)

      created.push({ contract_id: c.id, job_id: jobId!, job_number: jobNumber })
    } catch (e) {
      errors.push({ contract_id: c.id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return new Response(
    JSON.stringify({
      processed: contracts?.length ?? 0,
      created: created.length,
      errors: errors.length,
      details: { created, errors },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})