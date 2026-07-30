ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS review_request_template text,
  ADD COLUMN IF NOT EXISTS review_request_link text;

UPDATE public.business_settings
SET review_request_link = 'https://g.page/r/CVI5xmZYC-NAEBM/review',
    review_request_template = 'Hi {first_name}! Hope everything looks great — thanks again for having Gulf Coast Palms out. We''re trying to reach 200 Google reviews by the end of the season, and every single one gets us a little closer. Here''s the link to make it easy: {review_link} Thanks again and see you next time 👍'
WHERE business_id = 'b0000000-0000-0000-0000-000000000001';