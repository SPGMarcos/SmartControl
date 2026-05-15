create index if not exists devices_user_connection_seen_idx
  on public.devices (user_id, connection_status, last_seen_at desc);

create index if not exists devices_user_updated_idx
  on public.devices (user_id, updated_at desc);

create index if not exists devices_mac_address_idx
  on public.devices (mac_address)
  where mac_address is not null and mac_address <> '';

create index if not exists sensors_user_updated_idx
  on public.sensors (user_id, updated_at desc);

create index if not exists logs_user_created_idx
  on public.logs (user_id, created_at desc)
  where user_id is not null;

create index if not exists subscriptions_email_idx
  on public.subscriptions (lower(email))
  where email is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
      when 'agro_profissional' then 60
      when 'estufa_inteligente' then 40
      when 'agro_escala' then 150
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
