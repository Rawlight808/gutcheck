-- Cloud storage for preferences that used to be device-local only:
-- custom tags, learned meals, the check-in metric template, and reminder
-- settings. One jsonb blob per user; the app does last-write-wins by
-- updated_at. Safe to run more than once.

create table if not exists user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_prefs enable row level security;

drop policy if exists "Users can view own prefs" on user_prefs;
create policy "Users can view own prefs"
  on user_prefs for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own prefs" on user_prefs;
create policy "Users can insert own prefs"
  on user_prefs for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own prefs" on user_prefs;
create policy "Users can update own prefs"
  on user_prefs for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own prefs" on user_prefs;
create policy "Users can delete own prefs"
  on user_prefs for delete using (auth.uid() = user_id);
