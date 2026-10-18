-- LumberOffer database schema. Run once in the Supabase SQL editor.
-- All access goes through the server with the service role key; row level
-- security is on with no policies, so the public anon key can read nothing.

create extension if not exists pgcrypto;

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  mill_name text not null default 'Your Mill',
  sender_name text not null default 'Sales',
  sender_email text not null default 'sales@example.com',
  subject_prefix text not null default 'Offer',
  fx_usd_cad numeric not null default 1.37,
  truck_pick text not null default 'max' check (truck_pick in ('max','min','avg')),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists lists (
  key text primary key,
  label text not null,
  mbf_tridem numeric not null default 30,
  mbf_tandem numeric not null default 24,
  mbf_superb numeric not null default 50,
  sort int not null default 0
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  list_key text not null references lists(key) on update cascade,
  dim text not null,
  description text not null,
  tally jsonb not null default '{}'::jsonb,   -- {"8":2,"10":4,...} units per length
  fbm int not null,                           -- volume in board feet
  ship text not null default 'Prompt',        -- 'Prompt' or a date (YYYY-MM-DD)
  usd numeric not null,                       -- mill price, US$/MBF
  cad numeric not null,                       -- mill price, C$/MBF
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists truck_rates (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  st text not null,
  equipment text not null check (equipment in ('Tridem/Maxi','Tandem','Super B')),
  carrier text not null default '',
  rate numeric not null check (rate > 0),     -- per truck
  currency text not null check (currency in ('USD','CAD')),
  quoted_on date
);
create index if not exists truck_rates_lane on truck_rates (lower(city), upper(st));

create table if not exists rail_rates (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  st text not null,
  carrier text not null,
  rate_mbf numeric not null check (rate_mbf > 0),
  currency text not null check (currency in ('USD','CAD'))
);
create index if not exists rail_rates_lane on rail_rates (lower(city), upper(st));

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  email text not null,
  currency text not null default 'USD' check (currency in ('USD','CAD')),
  lists text[] not null default '{}',
  dims text[] not null default '{}',
  adj numeric not null default 0,              -- $/MBF added to every delivered price
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists yards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  city text not null,
  st text not null,
  mode text not null default 'truck' check (mode in ('truck','rail')),
  equipment text not null default 'Tridem/Maxi',
  rail_carrier text,
  manual_frt numeric,                          -- $/MBF used when no rate is on file
  sort int not null default 0
);

create table if not exists sends (
  id uuid primary key default gen_random_uuid(),
  scope text,                                  -- list key, or null for every list
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists recipients (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references sends(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  token text not null unique,
  subject text not null,
  snapshot jsonb not null,                     -- the offer exactly as sent
  sent_at timestamptz,
  test_mode boolean not null default false,
  provider_id text,
  error text
);
create index if not exists recipients_customer on recipients (customer_id, sent_at desc);

create table if not exists opens (
  id bigserial primary key,
  recipient_id uuid not null references recipients(id) on delete cascade,
  kind text not null check (kind in ('page','pixel')),
  user_agent text,
  opened_at timestamptz not null default now()
);
create index if not exists opens_recipient on opens (recipient_id, opened_at desc);

create table if not exists bids (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references recipients(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  product_id uuid,
  product_label text not null,
  yard text not null,
  kind text not null check (kind in ('buy','counter')),
  price numeric not null,
  currency text not null,
  status text not null default 'new' check (status in ('new','confirmed','declined')),
  created_at timestamptz not null default now()
);

alter table settings enable row level security;
alter table lists enable row level security;
alter table products enable row level security;
alter table truck_rates enable row level security;
alter table rail_rates enable row level security;
alter table customers enable row level security;
alter table yards enable row level security;
alter table sends enable row level security;
alter table recipients enable row level security;
alter table opens enable row level security;
alter table bids enable row level security;
