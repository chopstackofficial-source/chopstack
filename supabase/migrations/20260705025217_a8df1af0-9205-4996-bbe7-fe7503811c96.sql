
-- Auto-grant vendor role when a vendor profile is created
CREATE OR REPLACE FUNCTION public.grant_vendor_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grant_vendor_role ON public.vendors;
CREATE TRIGGER trg_grant_vendor_role
AFTER INSERT ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.grant_vendor_role();

-- Auto-grant buyer role when a buyer profile is created
CREATE OR REPLACE FUNCTION public.grant_buyer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grant_buyer_role ON public.buyers;
CREATE TRIGGER trg_grant_buyer_role
AFTER INSERT ON public.buyers
FOR EACH ROW EXECUTE FUNCTION public.grant_buyer_role();

-- Paystack webhook event log (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.paystack_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  reference text,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paystack_events TO authenticated;
GRANT ALL ON public.paystack_events TO service_role;
ALTER TABLE public.paystack_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read paystack events" ON public.paystack_events;
CREATE POLICY "admin read paystack events" ON public.paystack_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Escrow release scheduling: default 4h window on paid orders lacking it
CREATE OR REPLACE FUNCTION public.set_escrow_release_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_status = 'delivered' AND OLD.delivery_status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at = COALESCE(NEW.delivered_at, now());
    NEW.escrow_release_at = COALESCE(NEW.escrow_release_at, NEW.delivered_at + interval '4 hours');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_escrow_release ON public.orders;
CREATE TRIGGER trg_set_escrow_release
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_escrow_release_on_delivered();
