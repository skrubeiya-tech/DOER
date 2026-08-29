-- DOER report & block tables (Apple UGC requirement) — run once in Supabase SQL editor
-- Safe to re-run: uses IF NOT EXISTS everywhere.

create table if not exists content_flags (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null,
  kind text not null,              -- 'clip' | 'moment' | 'bubble'
  subject_user uuid,               -- owner of the reported content (when known)
  moment_id text,                  -- moment/bubble id (when reporting a bubble)
  group_id uuid,                   -- where it was seen
  block boolean default false,     -- reporter also blocked the owner
  created_at timestamptz default now()
);
alter table content_flags enable row level security;
drop policy if exists "flags insert own" on content_flags;
create policy "flags insert own" on content_flags for insert with check (reporter = auth.uid());
drop policy if exists "flags select own" on content_flags;
create policy "flags select own" on content_flags for select using (reporter = auth.uid());

create table if not exists user_blocks (
  blocker uuid not null,
  blocked uuid not null,
  created_at timestamptz default now(),
  primary key (blocker, blocked)
);
alter table user_blocks enable row level security;
drop policy if exists "blocks all own" on user_blocks;
create policy "blocks all own" on user_blocks for all using (blocker = auth.uid()) with check (blocker = auth.uid());

-- Review queue (you, in the dashboard): select * from content_flags order by created_at desc;
