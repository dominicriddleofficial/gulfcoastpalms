# Gulf Coast Palms — Database Migration Plan

## Legacy Tables (Single-Tenant)
These tables predate the multi-tenant platform and are still used by the Admin Dashboard:
- `leads` → migrate to `platform_leads`
- `clients` → migrate to `platform_customers`
- `jobs` → migrate to `platform_jobs`
- `invoices` → migrate to `platform_invoices`
- `employees` → no direct platform equivalent (crew management differs)
- `reviews` → no direct platform equivalent (standalone feature)

## Migration Order (when ready)
1. leads (highest priority — active data)
2. clients
3. jobs
4. invoices
5. employees, reviews (lower priority)

## Rules
- Do NOT delete legacy tables without a full data migration and backup
- Do NOT add new features to components using legacy tables
- All new features should be built against platform_ tables
- Migration requires a data backfill script + a cutover window

## Status
Currently: Legacy tables and platform_ tables coexist
Admin Dashboard: Uses legacy tables
Platform: Uses platform_ tables
Goal: Full migration to platform_ tables (estimated effort: 1-2 weeks)
