ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS meetup_location text,
  ADD COLUMN IF NOT EXISTS meetup_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Update split-decrement trigger to also fire on meetup_scheduled etc.
-- existing handle_order_cancelled already handles status = 'cancelled' transitions.

-- Add a check constraint loosely (skip strict CHECK to avoid restore issues)
-- Validate via trigger instead.
CREATE OR REPLACE FUNCTION public.validate_order_methods()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_method IS NOT NULL AND NEW.delivery_method NOT IN ('delivery','meetup') THEN
    RAISE EXCEPTION 'invalid delivery_method';
  END IF;
  IF NEW.payment_method IS NOT NULL AND NEW.payment_method NOT IN ('cod','cash_at_meetup') THEN
    RAISE EXCEPTION 'invalid payment_method';
  END IF;
  IF NEW.status NOT IN ('pending','accepted','meetup_scheduled','completed','cancelled','declined') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_validate_methods ON public.orders;
CREATE TRIGGER orders_validate_methods
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_methods();