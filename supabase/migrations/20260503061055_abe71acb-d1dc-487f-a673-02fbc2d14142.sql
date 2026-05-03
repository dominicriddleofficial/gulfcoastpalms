ALTER TABLE public.platform_invoices REPLICA IDENTITY FULL;
ALTER TABLE public.platform_payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_payments;