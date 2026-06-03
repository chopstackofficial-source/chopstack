
-- Admin role infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-grant admin to platform owner email on signup/now
CREATE OR REPLACE FUNCTION public.grant_admin_if_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'chopstackofficial@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS grant_admin_if_owner_trigger ON auth.users;
CREATE TRIGGER grant_admin_if_owner_trigger
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_if_owner();

-- Grant admin now if the owner already signed up
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'chopstackofficial@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Vendor bank details
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code text;

-- Escrow + commission on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS vendor_payout_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS vendor_payout_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Update validation trigger to allow new states
CREATE OR REPLACE FUNCTION public.validate_order_methods()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.delivery_method IS NOT NULL AND NEW.delivery_method NOT IN ('delivery','meetup') THEN
    RAISE EXCEPTION 'invalid delivery_method';
  END IF;
  IF NEW.payment_method IS NOT NULL AND NEW.payment_method NOT IN ('cod','cash_at_meetup','paystack') THEN
    RAISE EXCEPTION 'invalid payment_method';
  END IF;
  IF NEW.status NOT IN ('pending','accepted','meetup_scheduled','completed','cancelled','declined') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF NEW.payment_status NOT IN ('unpaid','paid','refunded') THEN
    RAISE EXCEPTION 'invalid payment_status';
  END IF;
  IF NEW.escrow_status NOT IN ('none','held','released','refunded','frozen') THEN
    RAISE EXCEPTION 'invalid escrow_status';
  END IF;
  IF NEW.vendor_payout_status NOT IN ('none','pending','sent','failed') THEN
    RAISE EXCEPTION 'invalid vendor_payout_status';
  END IF;
  RETURN NEW;
END $$;

-- Ratings (vendor and transporter ratings live here; role distinguishes)
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('vendor','transporter')),
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, rater_id, role)
);

GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read ratings" ON public.ratings;
CREATE POLICY "anyone read ratings" ON public.ratings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "buyer inserts own rating" ON public.ratings;
CREATE POLICY "buyer inserts own rating" ON public.ratings
  FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid());

-- Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved_release','resolved_refund','closed')),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties view dispute" ON public.disputes;
CREATE POLICY "parties view dispute" ON public.disputes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "buyer opens dispute" ON public.disputes;
CREATE POLICY "buyer opens dispute" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (
    opened_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin updates dispute" ON public.disputes;
CREATE POLICY "admin updates dispute" ON public.disputes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can see/update all orders
DROP POLICY IF EXISTS "admin reads all orders" ON public.orders;
CREATE POLICY "admin reads all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin updates all orders" ON public.orders;
CREATE POLICY "admin updates all orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
