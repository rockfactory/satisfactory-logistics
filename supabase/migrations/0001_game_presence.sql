-- Lightweight HTTP-based presence table, used by useGamePresence hook to decide
-- whether to open a Supabase realtime websocket channel for a given save.
--
-- The client upserts its own row every ~45s (heartbeat) and polls the table
-- every ~45s to count other active peers. When count > 0, the realtime
-- websocket is opened; otherwise the client stays in HTTP-only mode.
--
-- Rows older than ~90s are considered stale (filtered out by the SELECT in
-- fetchPresence). No cron cleanup required; a follow-up pg_cron job may be
-- added later for cosmetic hygiene.

create table if not exists public.game_presence (
  saved_id     uuid        not null references public.games(id) on delete cascade,
  sender_id    text        not null,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (saved_id, sender_id)
);

create index if not exists game_presence_saved_last_seen_idx
  on public.game_presence (saved_id, last_seen_at desc);

alter table public.game_presence enable row level security;

-- SELECT: allowed for users who have access to the underlying game (authored
-- it, or it was shared with them). Mirrors the visibility rules of
-- public.games.
drop policy if exists "presence_select_if_game_visible" on public.game_presence;
create policy "presence_select_if_game_visible"
  on public.game_presence for select
  using (
    exists (
      select 1 from public.games g
      where g.id = game_presence.saved_id
        and (
          g.author_id = auth.uid()
          or exists (
            select 1 from public.shared_games s
            where s.game_id = g.id and s.user_id = auth.uid()
          )
        )
    )
  );

-- INSERT / UPDATE / DELETE: only on the caller's own row.
drop policy if exists "presence_insert_own" on public.game_presence;
create policy "presence_insert_own"
  on public.game_presence for insert
  with check (user_id = auth.uid());

drop policy if exists "presence_update_own" on public.game_presence;
create policy "presence_update_own"
  on public.game_presence for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "presence_delete_own" on public.game_presence;
create policy "presence_delete_own"
  on public.game_presence for delete
  using (user_id = auth.uid());
