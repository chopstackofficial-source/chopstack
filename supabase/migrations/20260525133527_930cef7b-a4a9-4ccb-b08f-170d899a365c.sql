
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.users (id, full_name, email, account_type, state, lga)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'account_type', 'buyer'),
    nullif(new.raw_user_meta_data->>'state', ''),
    nullif(new.raw_user_meta_data->>'lga', '')
  );
  return new;
end;
$function$;
