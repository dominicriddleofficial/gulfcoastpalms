# Legacy Table Migration Guide

This document tracks the migration from legacy single-tenant tables to the multi-tenant `platform_` equivalents.

## Table Mapping

| Legacy Table | Platform Equivalent | Status |
|---|---|---|
| `clients` | `platform_customers` | Not migrated |
| `jobs` | `platform_jobs` | Not migrated |
| `leads` | `platform_leads` | Not migrated |
| `invoices` | `platform_invoices` | Not migrated |
| `employees` | `platform_crew_members` | Not migrated |

## Admin Dashboard Pages Using Legacy Tables

| Page | Legacy Table(s) | File |
|---|---|---|
| Admin Clients | `clients` | `src/pages/admin/AdminClients.tsx` |
| Admin Jobs | `jobs` | `src/pages/admin/AdminJobs.tsx` |
| Admin Leads | `leads` | `src/pages/admin/AdminLeads.tsx` |
| Admin Employees | `employees` | `src/pages/admin/AdminEmployees.tsx` |
| Admin Crews | `crews` | `src/pages/admin/AdminCrews.tsx` |
| Admin Reviews | `reviews` | `src/pages/admin/AdminReviews.tsx` |
| Admin Job Issues | `job_issues` | `src/pages/admin/AdminJobIssues.tsx` |
| Admin Leaderboards | `leaderboard_rewards` | `src/pages/admin/AdminLeaderboards.tsx` |
| Admin Recurring | `recurring_services` | `src/pages/admin/AdminRecurring.tsx` |
| Admin Applicants | `job_applications` | `src/pages/admin/AdminApplicants.tsx` |

## Recommended Migration Order

1. **Leads** → `platform_leads` (lowest risk, new leads already go to platform_leads via public site)
2. **Clients** → `platform_customers` (depends on leads migration)
3. **Jobs** → `platform_jobs` (depends on clients migration)
4. **Invoices** → `platform_invoices` (depends on jobs migration)

## Migration Requirements

- [ ] Full database backup before starting
- [ ] Data backfill scripts for each table
- [ ] Update all admin dashboard queries
- [ ] Update all Jobber sync logic
- [ ] Verify RLS policies on platform_ tables cover admin access
- [ ] Test all admin CRUD operations after migration

## Important Notes

- **Do NOT delete legacy tables** until all admin dashboard pages are migrated and verified
- Legacy tables have different column schemas — mapping scripts are needed
- The `platform_` tables require a `business_id` foreign key for multi-tenancy
- Some legacy tables (e.g., `job_applications`, `sop_acknowledgments`) may not need platform_ equivalents if they are Gulf Coast Palms-specific
