ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card';

ALTER TABLE public.platform_invoices
  DROP CONSTRAINT IF EXISTS platform_invoices_payment_method_check;

ALTER TABLE public.platform_invoices
  ADD CONSTRAINT platform_invoices_payment_method_check
  CHECK (payment_method IN ('card', 'check'));

ALTER TABLE public.platform_customers
  ADD COLUMN IF NOT EXISTS prefers_check boolean NOT NULL DEFAULT false;