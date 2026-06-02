
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

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
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_validate_methods ON public.orders;
CREATE TRIGGER orders_validate_methods
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_methods();
