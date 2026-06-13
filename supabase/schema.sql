-- ===========================================================================
-- CRICOS — Supabase schema.  Run this in the Supabase dashboard:
--   Project → SQL Editor → New query → paste → Run.
-- It creates the profiles (UID) table, a cloud matches table, the auto-profile
-- trigger, and Row Level Security policies so players can see each other's data
-- while only editing their own.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Profiles: one row per signed-in user. profiles.id == auth.users.id == the UID.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  display_name text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up (pulls Google name/photo).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Matches: cloud copy of each match. `data` holds the full match JSON (so the
-- existing scoring engine is reused as-is); the flat columns make listing,
-- sharing and leaderboards queryable.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id          text primary key,
  owner_id    uuid references auth.users (id) on delete cascade,
  status      text,
  format      text,
  team1_name  text,
  team2_name  text,
  result_text text,
  is_public   boolean not null default true,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists matches_owner_idx on public.matches (owner_id);
create index if not exists matches_created_idx on public.matches (created_at desc);

alter table public.matches enable row level security;

drop policy if exists "Public matches are viewable by all" on public.matches;
create policy "Public matches are viewable by all"
  on public.matches for select using (is_public or auth.uid() = owner_id);

drop policy if exists "Users insert own matches" on public.matches;
create policy "Users insert own matches"
  on public.matches for insert with check (auth.uid() = owner_id);

drop policy if exists "Users update own matches" on public.matches;
create policy "Users update own matches"
  on public.matches for update using (auth.uid() = owner_id);

drop policy if exists "Users delete own matches" on public.matches;
create policy "Users delete own matches"
  on public.matches for delete using (auth.uid() = owner_id);
