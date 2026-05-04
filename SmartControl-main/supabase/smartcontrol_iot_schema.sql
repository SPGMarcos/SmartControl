-- SmartControl IoT production schema
-- Execute este arquivo no SQL Editor do Supabase antes do primeiro deploy.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text default 'custom',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,
  name text not null,
  type text not null default 'relay',
  status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sensors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  name text not null,
  type text not null default 'generic',
  unit text,
  value numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.devices
  add column if not exists device_id text,
  add column if not exists module_type text default 'generic_iot',
  add column if not exists project_name text,
  add column if not exists project_type text,
  add column if not exists device_model text,
  add column if not exists protocol text default 'mqtt',
  add column if not exists connection_status text default 'offline',
  add column if not exists online boolean default false,
  add column if not exists pairing_status text default 'manual',
  add column if not exists mac_address text,
  add column if not exists firmware_version text,
  add column if not exists hardware_version text,
  add column if not exists mqtt_broker text,
  add column if not exists mqtt_topic text,
  add column if not exists device_token text,
  add column if not exists local_ip text,
  add column if not exists mdns_hostname text,
  add column if not exists capabilities jsonb default '{}'::jsonb,
  add column if not exists configuration jsonb default '{}'::jsonb,
  add column if not exists last_state jsonb default '{}'::jsonb,
  add column if not exists telemetry jsonb default '{}'::jsonb,
  add column if not exists last_heartbeat timestamptz;

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid null references public.devices(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop index if exists devices_device_id_unique_idx;

create unique index if not exists devices_user_device_id_unique_idx
  on public.devices (user_id, device_id)
  where device_id is not null and device_id <> '';

create unique index if not exists devices_mqtt_topic_unique_idx
  on public.devices (mqtt_topic)
  where mqtt_topic is not null and mqtt_topic <> '';

create index if not exists devices_user_project_idx
  on public.devices (user_id, project_name);

create index if not exists devices_connection_status_idx
  on public.devices (connection_status);

create index if not exists sensors_device_created_idx
  on public.sensors (device_id, created_at desc);

create index if not exists logs_device_created_idx
  on public.logs (device_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists devices_set_updated_at on public.devices;
create trigger devices_set_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

drop trigger if exists sensors_set_updated_at on public.sensors;
create trigger sensors_set_updated_at
before update on public.sensors
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.devices enable row level security;
alter table public.sensors enable row level security;
alter table public.logs enable row level security;

drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects"
  on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own devices" on public.devices;
create policy "Users can manage own devices"
  on public.devices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own sensors" on public.sensors;
create policy "Users can manage own sensors"
  on public.sensors
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own logs" on public.logs;
create policy "Users can read own logs"
  on public.logs
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.devices d
      where d.id = logs.device_id
        and d.user_id = auth.uid()
    )
  );
