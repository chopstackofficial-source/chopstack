
-- USERS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  account_type text not null check (account_type in ('buyer', 'farmer')),
  avatar_url text,
  location text,
  latitude float,
  longitude float,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'account_type', 'buyer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
create policy "Users view own profile" on public.users for select using (auth.uid() = id);
create policy "Users update own profile" on public.users for update using (auth.uid() = id);
create policy "Anyone view farmer profiles" on public.users for select using (account_type = 'farmer');

-- LISTINGS
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null,
  quantity_available integer not null,
  unit text not null check (unit in ('kg','bag','bunch','piece','crate','rubber','bucket')),
  category text not null,
  images text[] default '{}',
  pickup_location text,
  pickup_latitude float,
  pickup_longitude float,
  split_enabled boolean default false,
  split_slots integer,
  status text default 'active' check (status in ('active','sold_out','deleted')),
  created_at timestamptz default now()
);
alter table public.listings enable row level security;
create policy "View active listings" on public.listings for select using (status <> 'deleted');
create policy "Farmer insert listings" on public.listings for insert with check (auth.uid() = farmer_id);
create policy "Farmer update listings" on public.listings for update using (auth.uid() = farmer_id);
create policy "Farmer delete listings" on public.listings for delete using (auth.uid() = farmer_id);

-- SPLITS
create table public.splits (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  farmer_id uuid not null references public.users(id) on delete cascade,
  total_slots integer not null,
  filled_slots integer default 0,
  status text default 'open' check (status in ('open','full','completed','cancelled')),
  created_at timestamptz default now()
);
alter table public.splits enable row level security;
create policy "View splits" on public.splits for select using (true);
create policy "Farmer insert splits" on public.splits for insert with check (auth.uid() = farmer_id);
create policy "Farmer update splits" on public.splits for update using (auth.uid() = farmer_id);
create policy "Anyone increment splits via join" on public.splits for update using (true);

-- BUNDLES
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null,
  cover_image text,
  target_audience text default 'all' check (target_audience in ('restaurants','caterers','households','all')),
  status text default 'active' check (status in ('active','sold_out','deleted')),
  created_at timestamptz default now()
);
alter table public.bundles enable row level security;
create policy "View active bundles" on public.bundles for select using (status <> 'deleted');
create policy "Farmer insert bundles" on public.bundles for insert with check (auth.uid() = farmer_id);
create policy "Farmer update bundles" on public.bundles for update using (auth.uid() = farmer_id);
create policy "Farmer delete bundles" on public.bundles for delete using (auth.uid() = farmer_id);

-- BUNDLE ITEMS
create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  item_name text not null,
  quantity text not null,
  created_at timestamptz default now()
);
alter table public.bundle_items enable row level security;
create policy "View bundle items" on public.bundle_items for select using (true);
create policy "Farmer manage bundle items" on public.bundle_items for all
  using (auth.uid() = (select farmer_id from public.bundles where id = bundle_id));

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  bundle_id uuid references public.bundles(id) on delete set null,
  buyer_id uuid not null references public.users(id) on delete cascade,
  farmer_id uuid not null references public.users(id) on delete cascade,
  order_type text not null check (order_type in ('solo','split','bundle')),
  split_id uuid references public.splits(id) on delete set null,
  quantity integer,
  total_price numeric not null,
  commission_amount numeric generated always as (total_price * 0.05) stored,
  status text default 'pending' check (status in ('pending','accepted','declined','completed','cancelled')),
  pickup_details text,
  created_at timestamptz default now()
);
alter table public.orders enable row level security;
create policy "Buyer view own orders" on public.orders for select using (auth.uid() = buyer_id);
create policy "Farmer view their orders" on public.orders for select using (auth.uid() = farmer_id);
create policy "Buyer insert orders" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "Farmer update orders" on public.orders for update using (auth.uid() = farmer_id);
create policy "Buyer cancel own orders" on public.orders for update using (auth.uid() = buyer_id);

-- SPLIT PARTICIPANTS
create table public.split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  joined_at timestamptz default now()
);
alter table public.split_participants enable row level security;
create policy "View split participants" on public.split_participants for select using (true);
create policy "Buyer join splits" on public.split_participants for insert with check (auth.uid() = buyer_id);

-- MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "View own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Send messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Receiver mark read" on public.messages for update using (auth.uid() = receiver_id);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null check (type in ('order','split','bundle','chat','system')),
  read boolean default false,
  reference_id uuid,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "View own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Mark own notifications read" on public.notifications for update using (auth.uid() = user_id);
create policy "System insert notifications" on public.notifications for insert with check (true);

-- AUTO SPLIT FULL
create or replace function public.handle_split_update()
returns trigger language plpgsql as $$
begin
  if new.filled_slots >= new.total_slots then
    new.status = 'full';
  end if;
  return new;
end;
$$;
create trigger on_split_slots_updated before update on public.splits
  for each row execute procedure public.handle_split_update();

-- DECREMENT ON CANCEL
create or replace function public.handle_order_cancelled()
returns trigger language plpgsql as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and old.order_type = 'split' and old.split_id is not null then
    update public.splits
    set filled_slots = greatest(filled_slots - 1, 0), status = 'open'
    where id = old.split_id;
  end if;
  return new;
end;
$$;
create trigger on_order_status_changed after update on public.orders
  for each row execute procedure public.handle_order_cancelled();

-- REALTIME
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.splits;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('listing-images','listing-images',true) on conflict (id) do nothing;

create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Auth upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Auth update avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Public read listing-images" on storage.objects for select using (bucket_id = 'listing-images');
create policy "Auth upload listing-images" on storage.objects for insert with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');
create policy "Auth update listing-images" on storage.objects for update using (bucket_id = 'listing-images' and auth.role() = 'authenticated');
