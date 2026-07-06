
CREATE TABLE public.delivery_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_km numeric(6,2) NOT NULL,
  max_km numeric(6,2) NOT NULL,
  delivery_fee numeric(10,2) NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_tiers TO anon, authenticated;
GRANT ALL ON public.delivery_tiers TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.delivery_tiers TO authenticated;
ALTER TABLE public.delivery_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers read" ON public.delivery_tiers FOR SELECT USING (true);
CREATE POLICY "tiers admin all" ON public.delivery_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER delivery_tiers_updated BEFORE UPDATE ON public.delivery_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.delivery_tiers (min_km, max_km, delivery_fee, sort_order) VALUES
  (0, 5, 2000, 1),
  (5, 10, 2800, 2);

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.orders
  ALTER COLUMN zone_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision,
  ADD COLUMN IF NOT EXISTS distance_km numeric(6,2);
