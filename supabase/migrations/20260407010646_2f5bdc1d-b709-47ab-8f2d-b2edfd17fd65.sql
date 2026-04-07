-- Add approval flow columns to platform_quotes
ALTER TABLE public.platform_quotes
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS change_request_notes text,
  ADD COLUMN IF NOT EXISTS change_requested_at timestamptz;

-- Allow anon to read quotes for the public approval page (like get-invoice-public pattern)
-- The actual access is gated by the edge function using service role
-- No direct anon policy needed since we use edge function with service role key