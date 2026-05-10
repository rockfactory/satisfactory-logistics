import { notifications } from '@mantine/notifications';
import type { QueryData } from '@supabase/supabase-js';
import type { Json } from '@/core/database.types';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { loadRemoteGameBySavedId } from '@/games/save/loadRemoteGame';
import { snapshotRemote } from '@/games/save/snapshotRemoteGame';
import { serializeGame } from '@/games/store/gameFactoriesActions';
import { withSuppressedDirtyTracking } from './dirtyTrackingSuppression';

const logger = loglev.getLogger('games:remote-list');

// Metadata-only listing. The full `data` JSONB blob is fetched lazily by
// `loadRemoteGamesList` for each game whose remote `updated_at` is strictly
// newer than the local copy (or whose local copy is absent altogether).
// Egress was the original driver here: pulling `data` for every game on
// every login pushed Postgres egress past the plan limit.
const loadRemoteGamesQuery = supabaseClient
  .from('games')
  .select(
    `
    id,
    name,
    author_id,
    created_at,
    updated_at,
    share_token
  `,
  )
  .order('created_at', { ascending: false });

export type RemoteLoadedGamesList = QueryData<typeof loadRemoteGamesQuery>;

// Inflight guard. Multiple concurrent invocations (StrictMode in dev,
// rapid auth state changes, opportunistic UI triggers) used to each fire
// their own metadata fetch + a parallel cascade of lazy-data fetches,
// double-counting against the egress budget. We coalesce them onto a
// single Promise so a second caller waits for the first to finish
// instead of re-doing the work.
let inflight: Promise<void> | null = null;

// Per-tab cache of savedIds whose full `data` blob we already pulled in
// this session. Guards against the duplicate-id failure mode (multiple
// cloud rows whose blobs share the same internal `serialized.game.id`):
// only the last applied wins in the local store, so without a cache the
// "losers" would look cloud-only on every subsequent metadata refresh and
// we'd re-pull them forever. Persisted-side disambiguation happens in
// `loadRemoteGameBySavedId` (id remap + resave); this cache stops the
// bleeding within the current session.
const sessionFetchedSavedIds = new Set<string>();

export function loadRemoteGamesList(): Promise<void> {
  if (inflight) {
    logger.debug('loadRemoteGamesList already inflight, joining');
    return inflight;
  }
  inflight = doLoadRemoteGamesList().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doLoadRemoteGamesList(): Promise<void> {
  const { auth } = useStore.getState();
  if (!auth.session) {
    console.log('No session, skipping load');
    return;
  }

  useStore.getState().setIsLoading(true);
  try {
    const { data, error } = await loadRemoteGamesQuery;

    if (error) {
      // Issue #127, audit vector #5: an error response previously
      // fell through and triggered `setRemoteGames(null/[])`, which
      // orphaned the savedId of every locally registered game.
      // Bail out cleanly so the local state is preserved.
      console.error('Error loading games:', error);
      notifications.show({
        color: 'red',
        title: 'Error loading games',
        message: error.message,
      });
      return;
    }

    if (!data) {
      console.log('No games loaded');
      return;
    }

    console.log('Loaded games metadata:', data);

    // Snapshot local state for any game whose remote copy is strictly
    // newer. We're about to apply remote in full (see the lazy fetch
    // below), so this captures any potential offline-only edits before
    // they're overwritten. Best-effort: a failed snapshot must not
    // block the merge.
    const overwrittenNames = await snapshotPreCloudMerge(data);

    // First pass: register metadata for every remote row, drop savedId
    // for local games that have disappeared from the user's authoritative
    // list. This does NOT require the `data` blob.
    withSuppressedDirtyTracking(() => {
      useStore.getState().setRemoteGames(data, { authoritative: true });
    });

    // Second pass: lazily fetch the full `data` blob ONLY for games that
    // need it: remote is strictly newer than local, or the game is not
    // present locally at all. This is what kept egress in the plan limits
    // when a user has many games but only edits one.
    const targets = collectFullFetchTargets(data);
    for (const savedId of targets) {
      if (sessionFetchedSavedIds.has(savedId)) {
        logger.debug(
          `lazy fetch: session cache hit, skipping savedId=${savedId}`,
        );
        continue;
      }
      sessionFetchedSavedIds.add(savedId);
      try {
        await loadRemoteGameBySavedId(savedId, { override: true });
      } catch (err) {
        // Drop from the cache so a later refresh can retry. The bleed
        // we're guarding against is the in-store collision pulling the
        // same row in a tight loop, not a one-off network error.
        sessionFetchedSavedIds.delete(savedId);
        logger.warn(`Failed to load remote game (savedId=${savedId})`, err);
      }
    }

    if (overwrittenNames.length > 0) {
      notifications.show({
        color: 'blue',
        title: 'Cloud version applied',
        message: `Newer changes from another device were applied for: ${overwrittenNames.join(', ')}. Your previous local copy is in Backups.`,
      });
    }
  } finally {
    useStore.getState().setIsLoading(false);
  }
}

/**
 * Walk the remote list and report which `savedId`s need a full `data`
 * fetch:
 *   - the local game does not exist (cloud-only, never seen on this
 *     device), or
 *   - the local game exists and remote `updated_at` is strictly newer
 *     than local.
 *
 * Local games with no `updatedAt` are treated as "needs fetch" so a
 * device that registered the game pre-sync still pulls authoritative
 * state.
 */
function collectFullFetchTargets(remoteGames: RemoteLoadedGamesList): string[] {
  const state = useStore.getState();
  const targets: string[] = [];
  const localBySavedId = new Map(
    Object.values(state.games.games)
      .filter(game => game.savedId)
      .map(game => [game.savedId, game]),
  );

  for (const remote of remoteGames) {
    const local = localBySavedId.get(remote.id);
    if (!local) {
      logger.info(
        `lazy fetch: cloud-only (savedId=${remote.id}, name="${remote.name}")`,
      );
      targets.push(remote.id);
      continue;
    }
    if (!local.updatedAt) {
      logger.info(
        `lazy fetch: local has no updatedAt (savedId=${remote.id}, name="${local.name}")`,
      );
      targets.push(remote.id);
      continue;
    }
    if (!remote.updated_at) continue;

    const remoteTs = new Date(remote.updated_at).getTime();
    const localTs = new Date(local.updatedAt).getTime();
    if (remoteTs > localTs) {
      logger.info(
        `lazy fetch: remote newer (savedId=${remote.id}, name="${local.name}", remote=${remote.updated_at}, local=${local.updatedAt}, deltaMs=${remoteTs - localTs})`,
      );
      targets.push(remote.id);
    }
  }

  if (targets.length === 0) {
    logger.info(
      `lazy fetch: nothing to pull (${remoteGames.length} games up-to-date)`,
    );
  } else {
    logger.info(
      `lazy fetch: ${targets.length}/${remoteGames.length} games need full data`,
    );
  }
  return targets;
}

/**
 * For each remote row whose `updated_at` is strictly newer than the matching
 * local game's `updatedAt`, take a `pre-cloud-merge` snapshot of the local
 * state. Returns the display names of games whose local copy was snapshotted
 * (caller uses this to surface a single notification).
 *
 * The matching key is the local `savedId` cross-checked against
 * `remote.id`. We deliberately don't peek inside `remote.data` (it isn't
 * fetched in the metadata-first listing) so the matcher works on the
 * pointer that's always present and trustworthy.
 */
export async function snapshotPreCloudMerge(
  remoteGames: RemoteLoadedGamesList,
): Promise<string[]> {
  const state = useStore.getState();
  const overwrittenNames: string[] = [];

  for (const remote of remoteGames) {
    const local = Object.values(state.games.games).find(
      g => g.savedId === remote.id,
    );
    if (!local?.savedId) continue;
    if (!remote.updated_at || !local.updatedAt) continue;

    const remoteTs = new Date(remote.updated_at).getTime();
    const localTs = new Date(local.updatedAt).getTime();
    if (remoteTs <= localTs) continue;

    try {
      const localData = serializeGame(local.id) as unknown as Json;
      const ok = await snapshotRemote(
        local.savedId,
        'pre-cloud-merge',
        localData,
      );
      if (ok) overwrittenNames.push(local.name);
    } catch (err) {
      logger.warn(
        `Pre-cloud-merge snapshot failed for "${local.name}" (savedId=${local.savedId})`,
        err,
      );
    }
  }

  return overwrittenNames;
}
