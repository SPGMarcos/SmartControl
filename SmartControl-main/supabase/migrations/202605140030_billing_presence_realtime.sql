create extension if not exists pgcrypto;

alter table public.devices
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_online_at timestamptz,
  add column if not exists last_offline_at timestamptz;

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  stripe_product_id text,
  plan_key text not null default 'free',
  plan_name text not null default 'SmartControl Free',
  status text not null default 'incomplete',
  device_limit integer not null default 3,
  period text not null default 'month',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists email text,
  add column if not exists device_limit integer not null default 3,
  add column if not exists period text not null default 'month';

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_invoice_id text not null unique,
  stripe_subscription_id text,
  amount_due integer not null default 0,
  amount_paid integer not null default 0,
  currency text not null default 'brl',
  status text not null default 'unknown',
  hosted_invoice_url text,
  invoice_pdf text,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  object_id text,
  status text not null default 'processing',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.device_presence_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('online', 'offline', 'heartbeat_timeout', 'reconnected')),
  reason text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_customers_stripe_customer_idx
  on public.billing_customers (stripe_customer_id);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status, current_period_end desc);

create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);

create index if not exists subscriptions_email_idx
  on public.subscriptions (lower(email))
  where email is not null;

create index if not exists subscription_invoices_user_created_idx
  on public.subscription_invoices (user_id, created_at desc);

create index if not exists stripe_webhook_events_type_created_idx
  on public.stripe_webhook_events (event_type, created_at desc);

create index if not exists stripe_webhook_events_object_idx
  on public.stripe_webhook_events (object_id)
  where object_id is not null;

create index if not exists device_presence_events_device_started_idx
  on public.device_presence_events (device_id, started_at desc);

create index if not exists device_presence_events_user_started_idx
  on public.device_presence_events (user_id, started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.get_smartcontrol_device_limit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  select coalesce(
    nullif(device_limit, 0),
    nullif((metadata->>'device_limit')::integer, 0),
    nullif((metadata->'plan'->>'device_limit')::integer, 0),
    case plan_key
      when 'residencial_smart' then 10
      when 'horta_urbana' then 12
      when 'produtor_essencial' then 25
      when 'agro_profissional' then 75
      when 'estufa_inteligente' then 60
      when 'agro_escala' then 250
      else 3
    end
  )
  into v_limit
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing', 'past_due')
  order by current_period_end desc nulls last, updated_at desc
  limit 1;

  return coalesce(v_limit, 3);
exception
  when others then
    return 3;
end;
$$;

create or replace function public.enforce_smartcontrol_device_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_current integer;
begin
  if new.user_id is null then
    return new;
  end if;

  v_limit := public.get_smartcontrol_device_limit(new.user_id);

  select count(*)
  into v_current
  from public.devices
  where user_id = new.user_id;

  if v_current >= v_limit then
    raise exception 'Limite de dispositivos do plano atual atingido (%).', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists devices_enforce_plan_limit on public.devices;
create trigger devices_enforce_plan_limit
before insert on public.devices
for each row execute function public.enforce_smartcontrol_device_limit();

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.device_presence_events enable row level security;

drop policy if exists "Users can read own billing customer" on public.billing_customers;
create policy "Users can read own billing customer"
  on public.billing_customers
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users can read own subscriptions"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own subscription invoices" on public.subscription_invoices;
create policy "Users can read own subscription invoices"
  on public.subscription_invoices
  for select
  using (auth.uid() = user_id);

drop policy if exists "No client access to stripe webhook events" on public.stripe_webhook_events;
create policy "No client access to stripe webhook events"
  on public.stripe_webhook_events
  for all
  using (false)
  with check (false);

drop policy if exists "Users can read own device presence events" on public.device_presence_events;
create policy "Users can read own device presence events"
  on public.device_presence_events
  for select
  using (auth.uid() = user_id);

alter table public.subscriptions replica identity full;
alter table public.subscription_invoices replica identity full;
alter table public.device_presence_events replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.subscriptions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.subscription_invoices;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.device_presence_events;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
