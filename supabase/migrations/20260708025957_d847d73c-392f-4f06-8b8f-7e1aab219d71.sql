
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_farm_product boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS farm_delivery_fee numeric;
ALTER TABLE public.products ALTER COLUMN vendor_id DROP NOT NULL;

DROP POLICY IF EXISTS "products public read" ON public.products;
CREATE POLICY "products public read" ON public.products
FOR SELECT
USING (
  (NOT is_sold_out)
  AND (quantity > 0)
  AND (
    is_farm_product = true
    OR EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = products.vendor_id
      AND v.status IN ('approved','active')
    )
  )
);
