
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS lga TEXT;

ALTER TABLE public.bundles
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.bundles
  DROP CONSTRAINT IF EXISTS bundles_category_check;

ALTER TABLE public.bundles
  ADD CONSTRAINT bundles_category_check
  CHECK (category IS NULL OR category = ANY (ARRAY['family','weekly_basics','proteins','party','student']));
