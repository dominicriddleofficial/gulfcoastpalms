
-- 0a. Delete platform_payments referencing fake invoices
DELETE FROM public.platform_payments
WHERE invoice_id IN (
  SELECT id FROM public.platform_invoices
  WHERE customer_id IN (
    '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
    '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
    '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
    '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
  )
);

-- 0b. Delete payment_intents referencing fake invoices
DELETE FROM public.payment_intents
WHERE invoice_id IN (
  SELECT id FROM public.platform_invoices
  WHERE customer_id IN (
    '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
    '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
    '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
    '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
  )
);

-- 1. Delete platform_invoice_line_items
DELETE FROM public.platform_invoice_line_items
WHERE invoice_id IN (
  SELECT id FROM public.platform_invoices
  WHERE customer_id IN (
    '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
    '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
    '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
    '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
  )
);

-- 2. Delete platform_invoices
DELETE FROM public.platform_invoices
WHERE customer_id IN (
  '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
  '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
  '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
  '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
);

-- 3. Delete platform_quote_line_items
DELETE FROM public.platform_quote_line_items
WHERE quote_id IN (
  SELECT id FROM public.platform_quotes
  WHERE customer_id IN (
    '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
    '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
    '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
    '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
  )
);

-- 4. Delete platform_quotes
DELETE FROM public.platform_quotes
WHERE customer_id IN (
  '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
  '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
  '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
  '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
);

-- 5. Delete seeded platform_job_visits
DELETE FROM public.platform_job_visits
WHERE id IN (
  'e0a00000-0000-0000-0000-000000000001','e0a00000-0000-0000-0000-000000000002',
  'e0a00000-0000-0000-0000-000000000003','e0a00000-0000-0000-0000-000000000004',
  'e0a00000-0000-0000-0000-000000000005','e0a00000-0000-0000-0000-000000000006'
);

-- 6. Delete seeded platform_jobs
DELETE FROM public.platform_jobs
WHERE id IN (
  'a0a00000-0000-0000-0000-000000000001','a0a00000-0000-0000-0000-000000000002',
  'a0a00000-0000-0000-0000-000000000003','a0a00000-0000-0000-0000-000000000004',
  'a0a00000-0000-0000-0000-000000000005','a0a00000-0000-0000-0000-000000000006',
  'a0a00000-0000-0000-0000-000000000007','a0a00000-0000-0000-0000-000000000008'
);

-- 7. Delete fake platform_customers (555 phones)
DELETE FROM public.platform_customers
WHERE id IN (
  '9253194a-ca85-491c-a9a3-4e4717d8983f','3380e132-7ebc-4598-831a-8513f05982ec',
  '8ba3c580-aa2d-4872-a351-8fe88cec8394','d0d19c5a-34aa-4acc-a067-e5dba5d483e2',
  '14743235-608a-437a-aff2-e92af16d89bc','c5bd9764-bb8d-4907-96a5-215d973e1975',
  '5b101bac-7f3a-40f2-a487-6727ec56e87f','54dd2d83-0419-42d3-84a2-89441eb600b8'
);

-- 8. Delete junk platform_customers (n/a, N/A, Big Bob, Na)
DELETE FROM public.platform_customers
WHERE id IN (
  '79c9291b-ca1c-4ea6-8e2e-8ed249a728b7','45939a12-89b6-4009-9643-a4f46e5ed848',
  '30fe6a40-49f0-452a-8b6d-56f9b61c1e8a','6b072fca-d65a-4ddb-9f3c-397191210871',
  'c608e4fd-722d-425d-8b6f-378b361c9e8f'
);

-- 9. Delete fake platform_leads (all 555 phones)
DELETE FROM public.platform_leads
WHERE id IN (
  'ac25e539-6e7d-44f3-b99d-72f1fe4ed0de','5594bf20-dff9-4a3c-a77f-a36d6d9bbaf9',
  '7c23d5eb-1d99-42ed-8291-35709ee9aa01','68b101ba-bd54-4aa1-bd43-2b2d5ec3dc00',
  'ad9358a3-9967-4bfe-8144-9c38f3d7832d','3acda392-a6a9-4181-918c-752782bc59c5',
  'cff75534-d1f8-471a-b9a8-9a74ab8c283d','335a23b0-4012-43b9-89ad-28c1e475fea1',
  '78b46ace-8534-4142-b7e1-2753e1b1b670','f352c845-11ef-4548-a0fe-0bd144668dd9',
  'f7abeffa-032f-49a2-bf41-29ae6f54cd89','a612106d-4ce8-4d83-8f19-ea314f37f20f'
);

-- 10. Delete test jobber_jobs
DELETE FROM public.jobber_jobs
WHERE id IN (
  'd2cc9522-26ef-4a7c-b932-14e46836e120',
  '70807231-ed08-43c8-bd96-5ec51c001c68'
);
