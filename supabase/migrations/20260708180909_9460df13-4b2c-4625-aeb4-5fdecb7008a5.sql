
-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_jobs_customer_status
  ON public.platform_jobs (customer_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobber_jobs_biz_phone10
  ON public.jobber_jobs (business_id, (right(regexp_replace(coalesce(client_phone,''), '\D', '', 'g'), 10)));

-- RPC
CREATE OR REPLACE FUNCTION public.get_yearly_trimming_roster(_business_id uuid)
RETURNS TABLE(
  face_customer_id uuid,
  display_name text,
  phone text,
  city text,
  source text,
  added_at timestamptz,
  jobs_count integer,
  last_job_at timestamptz,
  total_revenue numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_business_access(auth.uid(), _business_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH flagged AS (
    SELECT
      c.id,
      c.display_name,
      c.phone,
      c.yearly_trimming_source,
      c.yearly_trimming_added_at,
      NULLIF(right(regexp_replace(coalesce(c.phone,''), '\D', '', 'g'), 10), '') AS np10,
      CASE
        WHEN length(regexp_replace(coalesce(c.phone,''), '\D', '', 'g')) >= 10
        THEN right(regexp_replace(coalesce(c.phone,''), '\D', '', 'g'), 10)
        ELSE NULL
      END AS np
    FROM public.platform_customers c
    WHERE c.business_id = _business_id AND c.yearly_trimming = true
  ),
  -- Group key: normalized phone OR unique per-customer id (for no-phone rows)
  keyed AS (
    SELECT f.*, COALESCE(f.np, 'nc:' || f.id::text) AS gkey FROM flagged f
  ),
  cust_platform AS (
    SELECT
      k.id AS customer_id,
      count(*) FILTER (WHERE lower(coalesce(j.status,'')) IN ('completed','scheduled')) AS pcount,
      COALESCE(sum(j.total) FILTER (WHERE lower(coalesce(j.status,'')) IN ('completed','scheduled')), 0) AS prev,
      max(j.scheduled_start) FILTER (WHERE lower(coalesce(j.status,'')) IN ('completed','scheduled')) AS plast
    FROM keyed k
    LEFT JOIN public.platform_jobs j
      ON j.customer_id = k.id AND j.deleted_at IS NULL
    GROUP BY k.id
  ),
  cust_city AS (
    SELECT DISTINCT ON (p.customer_id) p.customer_id, p.city
    FROM public.platform_properties p
    WHERE p.customer_id IN (SELECT id FROM keyed)
    ORDER BY p.customer_id, p.created_at ASC
  ),
  -- Jobber history per unique phone (counted ONCE per phone group)
  phones AS (
    SELECT DISTINCT np FROM keyed WHERE np IS NOT NULL
  ),
  jobber_agg AS (
    SELECT
      right(regexp_replace(coalesce(jj.client_phone,''), '\D', '', 'g'), 10) AS np,
      count(*) AS jcount,
      COALESCE(sum(jj.total_amount), 0) AS jrev,
      max(jj.scheduled_start) AS jlast
    FROM public.jobber_jobs jj
    WHERE jj.business_id = _business_id
      AND right(regexp_replace(coalesce(jj.client_phone,''), '\D', '', 'g'), 10) IN (SELECT np FROM phones)
    GROUP BY 1
  ),
  grouped AS (
    SELECT
      k.gkey,
      k.np,
      -- Face row: prefer non-placeholder name, then earliest created (via yearly_trimming_added_at asc as tiebreaker approximation using id)
      (ARRAY_AGG(k.id ORDER BY
         CASE WHEN lower(coalesce(btrim(k.display_name),'')) IN ('','na','n/a','unknown') THEN 1 ELSE 0 END,
         k.yearly_trimming_added_at ASC NULLS LAST
      ))[1] AS face_id,
      (ARRAY_AGG(k.display_name ORDER BY
         CASE WHEN lower(coalesce(btrim(k.display_name),'')) IN ('','na','n/a','unknown') THEN 1 ELSE 0 END,
         k.yearly_trimming_added_at ASC NULLS LAST
      ))[1] AS face_name,
      (ARRAY_AGG(k.phone ORDER BY
         CASE WHEN lower(coalesce(btrim(k.display_name),'')) IN ('','na','n/a','unknown') THEN 1 ELSE 0 END,
         k.yearly_trimming_added_at ASC NULLS LAST
      ))[1] AS face_phone,
      CASE WHEN bool_or(k.yearly_trimming_source = 'manual') THEN 'manual' ELSE 'auto' END AS grp_source,
      max(k.yearly_trimming_added_at) AS grp_added_at,
      sum(COALESCE(cp.pcount, 0))::int AS grp_pcount,
      sum(COALESCE(cp.prev, 0))::numeric AS grp_prev,
      max(cp.plast) AS grp_plast
    FROM keyed k
    LEFT JOIN cust_platform cp ON cp.customer_id = k.id
    GROUP BY k.gkey, k.np
  )
  SELECT
    g.face_id AS face_customer_id,
    g.face_name AS display_name,
    g.face_phone AS phone,
    (SELECT cc.city FROM cust_city cc WHERE cc.customer_id = g.face_id
      UNION ALL
      SELECT cc2.city FROM cust_city cc2
        JOIN keyed k2 ON k2.id = cc2.customer_id
       WHERE k2.gkey = g.gkey
       LIMIT 1
    ) AS city,
    g.grp_source AS source,
    g.grp_added_at AS added_at,
    (g.grp_pcount + COALESCE(ja.jcount, 0))::int AS jobs_count,
    GREATEST(g.grp_plast, ja.jlast) AS last_job_at,
    (g.grp_prev + COALESCE(ja.jrev, 0))::numeric AS total_revenue
  FROM grouped g
  LEFT JOIN jobber_agg ja ON ja.np = g.np
  ORDER BY GREATEST(g.grp_plast, ja.jlast) DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_yearly_trimming_roster(uuid) TO authenticated;
