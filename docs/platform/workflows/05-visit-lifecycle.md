# Visit Lifecycle State Machine

States stored in `platform_job_visits.status`.

```
scheduled ──▶ on_my_way ──▶ in_progress ──▶ completed
    │              │              │
    ▼              ▼              ▼
cancelled     cancelled      cancelled
```

## Transitions

| From | To | Trigger | Edge function | Side effects |
|---|---|---|---|---|
| `scheduled` | `on_my_way` | Crew taps "On My Way" | `update-visit-status` | SMS to customer ETA |
| `on_my_way` | `in_progress` | Crew taps "Start Visit" | `update-visit-status` | Sets `actual_start_at` |
| `in_progress` | `completed` | Crew taps "Complete Visit" | `update-visit-status` | Sets `actual_end_at`, queues review SMS, may trigger invoice generation |
| any | `cancelled` | Owner cancels | `update-visit-status` | Audit log only |

## Idempotency

- Each mutation includes a `client_mutation_id` (UUID) generated client-side
- `mutation_idempotency` table dedupes — replays return the prior result
- This protects offline queue replays after reconnection

## Required data

- Cannot mark `completed` without `actual_start_at`
- Cannot mark `on_my_way` without an assigned crew member
- Crew can only update visits assigned to them (RLS via `platform_visit_assignments`)
