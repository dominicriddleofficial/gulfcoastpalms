-- Cleanup: delete leads created during pipeline verification tests.
DELETE FROM public.email_drip_enrollments
WHERE lead_id IN (
  SELECT id FROM public.leads
  WHERE name ILIKE 'PIPE TEST%'
     OR name ILIKE 'TEST LEAD%'
     OR name IN ('TRIG TEST','PIPE TEST psql anon','X','NoContact Test')
);
DELETE FROM public.leads
WHERE name ILIKE 'PIPE TEST%'
   OR name ILIKE 'TEST LEAD%'
   OR name IN ('TRIG TEST','PIPE TEST psql anon','X','NoContact Test');
DELETE FROM public.platform_leads
WHERE inquiry_name ILIKE 'PIPE TEST%'
   OR inquiry_name ILIKE 'TEST LEAD%'
   OR inquiry_name IN ('TRIG TEST','PIPE TEST psql anon','X','NoContact Test');
