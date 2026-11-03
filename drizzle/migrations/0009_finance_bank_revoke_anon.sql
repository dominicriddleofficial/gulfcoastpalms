REVOKE ALL ON public.finance_expense_allocations, public.finance_bank_imports, public.finance_bank_transactions FROM anon, PUBLIC;
REVOKE INSERT, TRUNCATE, REFERENCES, TRIGGER ON public.finance_bank_imports, public.finance_bank_transactions FROM authenticated;
REVOKE UPDATE ON public.finance_bank_imports FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.finance_import_bank_csv(uuid, text, text, jsonb) FROM anon, PUBLIC;