-- Trim the response of public.snapshot_game so it returns the inserted row's
-- id only, instead of echoing the full game_versions row back to the client.
--
-- Before: `returns public.game_versions` — PostgREST shipped the entire row,
-- including the `data jsonb` blob the client just uploaded. For a typical
-- 500 KB game blob, every snapshot doubled the I/O (upload + identical
-- echo download), counting against the Postgres egress budget even though
-- the client destructures only `error` and never reads the body.
--
-- After: `returns uuid`. Backward-compatible at the client layer: existing
-- code already ignores the return value, so cached PWAs keep working with
-- no code change. The TS types regenerate from the new signature on the
-- next `npm run supabase:types`.
--
-- We DROP + CREATE because PostgreSQL's `CREATE OR REPLACE FUNCTION` does
-- not allow changing the return type; the whole migration runs in a single
-- transaction so there is no live window where the function is missing.

drop function if exists public.snapshot_game(uuid, jsonb, text);

create function public.snapshot_game(
  p_saved_id uuid,
  p_data     jsonb,
  p_reason   text default 'auto'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_v int;
  inserted_id uuid;
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
  returning id into inserted_id;

  -- Ring-buffer trim: keep the 20 most recent rows.
  delete from public.game_versions
  where saved_id = p_saved_id
    and id not in (
      select id from public.game_versions
      where saved_id = p_saved_id
      order by created_at desc
      limit 20
    );

  return inserted_id;
end;
$$;

revoke all on function public.snapshot_game(uuid, jsonb, text) from public;
grant execute on function public.snapshot_game(uuid, jsonb, text) to authenticated;
