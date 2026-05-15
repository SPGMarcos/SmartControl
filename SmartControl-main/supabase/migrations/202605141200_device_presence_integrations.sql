alter table public.device_presence_events
  drop constraint if exists device_presence_events_event_type_check;

alter table public.device_presence_events
  add constraint device_presence_events_event_type_check
  check (event_type in ('online', 'offline', 'reconnect', 'timeout'));

alter table public.devices
  add column if not exists integration_id uuid,
  add column if not exists integration_provider text,
  add column if not exists external_device_ref text,
  add column if not exists last_seen timestamptz;

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  name text not null,
  status text not null default 'configured',
  configuration jsonb not null default '{}'::jsonb,
  credentials_ref text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, name)
);

create table if not exists public.device_entities (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  external_entity_ref text,
  entity_key text not null,
  name text not null,
  domain text not null,
  state jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, entity_key)
);

create table if not exists public.device_capabilities (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  entity_id uuid references public.device_entities(id) on delete cascade,
  capability text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, entity_id, capability)
);

create index if not exists devices_integration_ref_idx
  on public.devices (integration_provider, external_device_ref)
  where external_device_ref is not null;

create index if not exists integrations_user_provider_idx
  on public.integrations (user_id, provider);

create index if not exists device_entities_device_idx
  on public.device_entities (device_id);

create index if not exists device_capabilities_device_idx
  on public.device_capabilities (device_id);

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

drop trigger if exists device_entities_set_updated_at on public.device_entities;
create trigger device_entities_set_updated_at
before update on public.device_entities
for each row execute function public.set_updated_at();

drop trigger if exists device_capabilities_set_updated_at on public.device_capabilities;
create trigger device_capabilities_set_updated_at
before update on public.device_capabilities
for each row execute function public.set_updated_at();
