
-- Vendors: no approval gate. Default active. Add photo_url.
ALTER TABLE public.vendors ALTER COLUMN status SET DEFAULT 'active';
UPDATE public.vendors SET status = 'active' WHERE status IN ('pending','approved');
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS photo_url text;

-- Buyers: delivery_address
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS delivery_address text;

-- Order number: CS-XXXXX (6 alphanumeric)
CREATE OR REPLACE FUNCTION public.gen_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  exists_flag boolean;
  i int;
BEGIN
  LOOP
    candidate := 'CS-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_number = candidate) INTO exists_flag;
    EXIT WHEN NOT exists_flag;
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT public.gen_order_number();

-- Update delivery_status validation: confirmed | on_the_way | delivered  (plus cancelled/pending for legacy)
CREATE OR REPLACE FUNCTION public.validate_order_methods()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status NOT IN ('unpaid','paid','refunded') THEN
    RAISE EXCEPTION 'invalid payment_status';
  END IF;
  IF NEW.escrow_status NOT IN ('none','held','released','refunded','disputed','frozen') THEN
    RAISE EXCEPTION 'invalid escrow_status';
  END IF;
  IF NEW.delivery_status NOT IN ('pending','confirmed','on_the_way','delivered','cancelled') THEN
    RAISE EXCEPTION 'invalid delivery_status';
  END IF;
  RETURN NEW;
END $function$;

-- Publicly readable vendors (active only)
DROP POLICY IF EXISTS "Vendors are viewable by everyone" ON public.vendors;
CREATE POLICY "Active vendors are viewable by everyone" ON public.vendors
  FOR SELECT USING (status = 'active');

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_zones TO anon;
GRANT SELECT ON public.zones TO anon;
