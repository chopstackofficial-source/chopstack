UPDATE public.vendors SET status = 'active' WHERE status = 'approved';

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_status_check
  CHECK (status = ANY (ARRAY['active','pending','approved','suspended','rejected']));

UPDATE public.orders SET delivery_status = 'confirmed' WHERE delivery_status = 'pending';
UPDATE public.orders SET delivery_status = 'on_the_way' WHERE delivery_status IN ('packed','out_for_delivery');

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_status_check
  CHECK (delivery_status = ANY (ARRAY['confirmed','on_the_way','delivered','cancelled']));