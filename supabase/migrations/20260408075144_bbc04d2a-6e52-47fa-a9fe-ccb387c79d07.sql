create table public.messaging_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  social_account_id uuid not null,
  platform text not null,
  conversation_id text not null,
  participant_name text,
  participant_avatar text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, conversation_id)
);

-- Add validation trigger instead of check constraint
create or replace function public.validate_messaging_cache_platform()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.platform not in ('facebook', 'instagram') then
    raise exception 'platform must be facebook or instagram';
  end if;
  return new;
end;
$$;

create trigger trg_validate_messaging_cache_platform
before insert or update on public.messaging_cache
for each row execute function public.validate_messaging_cache_platform();

-- Auto-update updated_at
create trigger update_messaging_cache_updated_at
before update on public.messaging_cache
for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.messaging_cache enable row level security;

create policy "Users can manage own messaging cache"
on public.messaging_cache
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Index for fast lookups
create index idx_messaging_cache_user_platform on public.messaging_cache(user_id, platform);
create index idx_messaging_cache_social_account on public.messaging_cache(social_account_id);