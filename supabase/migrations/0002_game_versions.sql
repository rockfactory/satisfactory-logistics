-- Game version history (snapshot ring buffer) + optimistic-locking helpers.
--
-- Background: see issue #127 (rockfactory/satisfactory-logistics) — a multi-device
-- sync corner case overwrote a user's game with a stale state. This migration
-- introduces the safety net we need to recover from those events:
--
--   1. public.game_versions: a per-game ring buffer of up to 20 snapshots, plus
--      an RPC (`snapshot_game`) that takes a new snapshot atomically and trims
--      the buffer in the same transaction.
--
--   2. before-update trigger on public.games that bumps `updated_at = now()`
--      server-side. The new client uses conditional updates against
--      `updated_at` for optimistic locking; relying on the server clock
--      removes a millisecond-level race between two clients with identical
--      `updated_at` values.
--
-- All changes are purely additive and retro-compatible with cached PWA clients
-- still running the old code (they keep working unchanged).

------------------------------------------------------------------------
-- 1. Table: public.game_versions
------------------------------------------------------------------------

create table if not exists public.game_versions (
  id          uuid        primary key default gen_random_uuid(),
  saved_id    uuid        not null references public.games(id) on delete cascade,
  version     int         not null,
  data        jsonb       not null,
  reason      text        not null default 'auto',
  author_id   uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists game_versions_saved_created_idx
  on public.game_versions (saved_id, created_at desc);

create unique index if not exists game_versions_saved_version_idx
  on public.game_versions (saved_id, version);

------------------------------------------------------------------------
-- 2. Row-level security on game_versions
--
-- SELECT mirrors `games` visibility (author OR shared collaborator).
-- INSERT goes exclusively through the `snapshot_game` RPC (security
-- definer) which performs its own permission check, so we keep RLS
-- enabled but only expose SELECT directly. No DELETE policy: trimming
-- happens inside the same security-definer RPC.
------------------------------------------------------------------------

alter table public.game_versions enable row level security;

drop policy if exists "game_versions_select_if_game_visible" on public.game_versions;
create policy "game_versions_select_if_game_visible"
  on public.game_versions for select
  using (
    exists (
      select 1 from public.games g
      where g.id = game_versions.saved_id
        and (
          g.author_id = auth.uid()
          or exists (
            select 1 from public.shared_games s
            where s.game_id = g.id and s.user_id = auth.uid()
          )
        )
    )
  );

------------------------------------------------------------------------
-- 3. RPC: public.snapshot_game(p_saved_id, p_data, p_reason)
--
-- Atomically:
--   - validates the caller has write access to the game,
--   - allocates the next version number,
--   - inserts a new row,
--   - trims older rows so at most 20 remain per saved_id.
--
-- Runs as security definer so the trim DELETE can remove rows belonging
-- to other collaborators on a shared game (RLS would otherwise block
-- cross-user deletes). Permission is enforced inline.
------------------------------------------------------------------------

create or replace function public.snapshot_game(
  p_saved_id uuid,
  p_data     jsonb,
  p_reason   text default 'auto'
)
returns public.game_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  next_v int;
  inserted public.game_versions;
begin
  if auth.uid() is null then
    raise exception 'snapshot_game requires authentication';
  end if;

  -- Permission check: caller must be game author or a shared collaborator.
  if not exists (
    select 1 from public.games g
    where g.id = p_saved_id
      and (
        g.author_id = auth.uid()
        or exists (
          select 1 from public.shared_games s
          where s.game_id = g.id and s.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'snapshot_game: forbidden';
  end if;

  select coalesce(max(version), 0) + 1 into next_v
  from public.game_versions
  where saved_id = p_saved_id;

  insert into public.game_versions (saved_id, version, data, reason, author_id)
  values (p_saved_id, next_v, p_data, p_reason, auth.uid())
  returning * into inserted;

  -- Ring-buffer trim: keep the 20 most recent rows.
  delete from public.game_versions
  where saved_id = p_saved_id
    and id not in (
      select id from public.game_versions
      where saved_id = p_saved_id
      order by created_at desc
      limit 20
    );

  return inserted;
end;
$$;

revoke all on function public.snapshot_game(uuid, jsonb, text) from public;
grant execute on function public.snapshot_game(uuid, jsonb, text) to authenticated;

------------------------------------------------------------------------
-- 4. Server-side updated_at on public.games
--
-- Old clients send `updated_at` explicitly in their PATCH body; this
-- trigger overrides it with `now()` so the value the client reads back
-- in the response is always authoritative. New clients omit the field
-- and rely entirely on the trigger.
--
-- Side effect for new clients: conditional updates filter on the
-- pre-update `updated_at` (`?updated_at=eq.<lastKnown>`); the trigger
-- only fires when the row passes the filter, so the conditional check
-- still works correctly.
------------------------------------------------------------------------

create or replace function public.touch_games_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at
before update on public.games
for each row
execute function public.touch_games_updated_at();
