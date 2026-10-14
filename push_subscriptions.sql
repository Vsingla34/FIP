-- Run once in the Supabase SQL editor
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "own subscriptions insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "own subscriptions update" on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy "own subscriptions select" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "own subscriptions delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
