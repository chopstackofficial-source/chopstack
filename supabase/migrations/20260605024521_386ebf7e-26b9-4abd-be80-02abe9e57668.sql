
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS landmark text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS available_today boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS town text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_slot text;

-- Refresh the order-validation trigger to accept delivery_slot values
CREATE OR REPLACE FUNCTION public.validate_order_methods()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
  IF NEW.delivery_slot IS NOT NULL AND NEW.delivery_slot NOT IN ('now','10-12','12-2','2-4','4-6','6-8') THEN
    RAISE EXCEPTION 'invalid delivery_slot';
  END IF;
  RETURN NEW;
END $function$;

-- Trigger may not be attached yet; ensure it exists
DROP TRIGGER IF EXISTS validate_order_methods_trg ON public.orders;
CREATE TRIGGER validate_order_methods_trg
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_methods();
