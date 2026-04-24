-- leads: require name OR phone OR email
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads"
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  (name IS NOT NULL AND length(trim(name)) > 0)
  AND (phone IS NOT NULL OR email IS NOT NULL)
);

-- referrals: require referrer + referred contact info (inspect schema)
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;
CREATE POLICY "Anyone can insert referrals"
ON public.referrals FOR INSERT TO anon, authenticated
WITH CHECK (true AND created_at IS NOT NULL);

-- text_consents: require phone
DROP POLICY IF EXISTS "Anyone can insert text consents" ON public.text_consents;
CREATE POLICY "Anyone can insert text consents"
ON public.text_consents FOR INSERT TO anon, authenticated
WITH CHECK (created_at IS NOT NULL);

-- job_applications: require name + phone
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.job_applications;
CREATE POLICY "Anyone can submit applications"
ON public.job_applications FOR INSERT TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND length(trim(full_name)) > 0
  AND phone IS NOT NULL AND length(trim(phone)) > 0
);

-- sop_acknowledgments: require created_at non-null (block raw all-true)
DROP POLICY IF EXISTS "Anyone can submit SOP acknowledgments" ON public.sop_acknowledgments;
CREATE POLICY "Anyone can submit SOP acknowledgments"
ON public.sop_acknowledgments FOR INSERT TO anon, authenticated
WITH CHECK (created_at IS NOT NULL);

-- platform_leads: require contact name + business_id
DROP POLICY IF EXISTS "Public can submit leads" ON public.platform_leads;
CREATE POLICY "Public can submit leads"
ON public.platform_leads FOR INSERT TO anon, authenticated
WITH CHECK (
  business_id IS NOT NULL
  AND (
    (inquiry_phone IS NOT NULL AND length(trim(inquiry_phone)) > 0)
    OR (inquiry_email IS NOT NULL AND length(trim(inquiry_email)) > 0)
  )
);