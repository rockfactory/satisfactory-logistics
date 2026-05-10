import { notifications } from '@mantine/notifications';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import type { GameRemoteData } from '@/games/Game';
import { withSuppressedDirtyTracking } from '@/games/save/dirtyTrackingSuppression';
import { loadRemoteGame } from '@/games/save/loadRemoteGame';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { snapshotRemote } from '@/games/save/snapshotRemoteGame';
import { serializeGame } from '@/games/store/gameFactoriesActions';
import { assessIncomingShrink, assessLocalVsRemote } from './integrityGuard';
import type { PeerInfo } from './peersSlice';
import {
  BROADCAST_FULL_REQUEST,
  BROADCAST_FULL_RESPONSE,
  DB_FALLBACK_MS,
  type FullStateRequestPayload,
  type FullStateResponsePayload,
  type PatchBroadcastPayload,
  type PresencePayload,
  SENDER_ID,
  withSuppressedBroadcast,
} from './realtimeSyncTypes';
import { safeChannelSend } from './safeChannelSend';

const logger = loglev.getLogger('games:realtime-sync');

export interface SyncRefs {
  isApplyingRemote: { current: boolean };
  isLeader: { current: boolean };
  seq: { current: number };
  /**
   * Wall-clock timestamp (ms) of the most recent patch this tab has
   * either applied (incoming peer broadcast) or generated (local edit).
   * Used by `flushRemoteGameOnUnload` to detect that the tab has been
   * isolated from the channel for too long to trust its state on
   * unload — see issue #127.
   */
  lastPatchAppliedAt: { current: number };
}

export interface SyncTimers {
  dbFallback: ReturnType<typeof setTimeout> | null;
}

export function handleIncomingPatches(
  data: PatchBroadcastPayload,
  remoteSeqs: Map<string, number>,
  refs: SyncRefs,
  requestFullState: () => void,
) {
  if (data.senderId === SENDER_ID) return;

  const lastSeq = remoteSeqs.get(data.senderId) ?? -1;

  if (data.seq <= lastSeq) {
    logger.debug(
      `Ignoring out-of-order patch from ${data.senderId} (seq=${data.seq}, expected>${lastSeq})`,
    );
    return;
  }

  if (lastSeq >= 0 && data.seq !== lastSeq + 1) {
    logger.info(
      `Missed patches from ${data.senderId} (got seq=${data.seq}, expected=${lastSeq + 1}), requesting full state`,
    );
    requestFullState();
    remoteSeqs.set(data.senderId, data.seq);
    return;
  }

  remoteSeqs.set(data.senderId, data.seq);
  logger.debug(
    `Applying ${data.patches.length} remote patches (seq=${data.seq})`,
  );
  refs.isApplyingRemote.current = true;
  try {
    // Go through the dedicated action so the wrapper preserves the immer
    // frozen invariant. withSuppressedBroadcast prevents the action's own
    // emitted patches from being broadcast back to the sender.
    withSuppressedBroadcast(() => {
      useStore.getState().applyRemotePatches(data.patches);
    });
    refs.lastPatchAppliedAt.current = Date.now();
  } catch (err) {
    logger.error('Failed to apply patches, requesting full state', err);
    requestFullState();
  } finally {
    refs.isApplyingRemote.current = false;
  }
}

export function handleFullStateRequest(
  data: FullStateRequestPayload,
  channel: RealtimeChannel,
  gameId: string,
  refs: SyncRefs,
) {
  if (data.senderId === SENDER_ID) return;

  logger.info('Peer requested full state, sending');
  try {
    const latestGame = useStore.getState().games.games[gameId];
    if (!latestGame?.savedId) return;

    const serialized = serializeGame(gameId);
    const remoteData: Partial<GameRemoteData> = {
      id: latestGame.savedId,
      author_id: latestGame.authorId,
      created_at: latestGame.createdAt,
      updated_at: latestGame.updatedAt,
      share_token: latestGame.shareToken,
    };

    safeChannelSend({
      channel,
      message: {
        type: 'broadcast',
        event: BROADCAST_FULL_RESPONSE,
        payload: {
          senderId: SENDER_ID,
          seq: refs.seq.current,
          serialized,
          remoteData,
        } satisfies FullStateResponsePayload,
      },
      context: 'full state response',
    });
  } catch (err) {
    logger.error('Failed to send full state response', err);
  }
}

export function handleFullStateResponse(
  data: FullStateResponsePayload,
  remoteSeqs: Map<string, number>,
  refs: SyncRefs,
  timers: SyncTimers,
) {
  if (data.senderId === SENDER_ID) return;

  if (timers.dbFallback !== null) {
    clearTimeout(timers.dbFallback);
    timers.dbFallback = null;
  }

  logger.info(`Received full state response (seq=${data.seq}), applying`);
  remoteSeqs.set(data.senderId, data.seq);

  // Shrink guard: an incoming full state that drops the factory count
  // sharply is the signature of issue #127. Snapshot the current local
  // state to game_versions before applying, so the user can recover
  // even if the incoming payload turns out to be corrupted. We never
  // skip applying — that would break convergence with the cluster.
  const incomingGameId = data.serialized.game.id;
  const localGame = useStore.getState().games.games[incomingGameId];
  const verdict = assessIncomingShrink(localGame, data.serialized);
  if (verdict.suspiciousShrink && localGame?.savedId) {
    logger.warn(
      `Suspicious shrink in full-state response: ${verdict.previousFactoryCount} -> ${verdict.nextFactoryCount} factories. Snapshotting current state before applying.`,
    );
    const savedId = localGame.savedId;
    void snapshotRemote(
      savedId,
      'shrink-guard-fullstate',
      serializeGame(incomingGameId) as never,
    );
    notifications.show({
      title: 'Backup snapshot saved before sync',
      message:
        'A large drop in factories was detected from another device. The previous state has been backed up under Game settings → Backup history.',
      color: 'blue',
    });
  }

  refs.isApplyingRemote.current = true;
  try {
    withSuppressedDirtyTracking(() => {
      useStore.getState().loadRemoteGame(data.serialized, data.remoteData, {
        override: true,
      });
    });
    refs.lastPatchAppliedAt.current = Date.now();
  } finally {
    refs.isApplyingRemote.current = false;
  }
}

export function requestFullStateWithFallback(
  channel: RealtimeChannel,
  gameId: string,
  refs: SyncRefs,
  timers: SyncTimers,
) {
  safeChannelSend({
    channel,
    message: {
      type: 'broadcast',
      event: BROADCAST_FULL_REQUEST,
      payload: { senderId: SENDER_ID } satisfies FullStateRequestPayload,
    },
    context: 'full state request',
  });

  if (timers.dbFallback !== null) clearTimeout(timers.dbFallback);
  timers.dbFallback = setTimeout(async () => {
    timers.dbFallback = null;
    logger.info('No peer response, reconciling with database');
    try {
      const localGame = useStore.getState().games.games[gameId];
      const savedId = localGame?.savedId;
      if (!savedId) return;

      // Read `updated_at` (winner choice) plus a JSONB-projected
      // `factoriesIds` (used for the leader-path shrink guard). Projecting
      // through PostgREST instead of pulling the full `data` blob is what
      // keeps Postgres egress in check: a single typical save's `data`
      // weighs hundreds of KB, while `factoriesIds` is at most a few KB.
      const { data, error } = await supabaseClient
        .from('games')
        .select('updated_at, factory_ids:data->game->factoriesIds')
        .eq('id', savedId)
        .single();

      if (error) throw error;

      const dbTime = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
      const localTime = localGame.updatedAt
        ? new Date(localGame.updatedAt).getTime()
        : 0;

      if (dbTime > localTime) {
        logger.info('DB is newer, loading remote state');
        refs.isApplyingRemote.current = true;
        await loadRemoteGame(gameId, { override: true });
        refs.isApplyingRemote.current = false;
        return;
      }

      if (!refs.isLeader.current) {
        logger.info('Local is newer or equal, skipping save (not leader)');
        return;
      }

      // Leader path: before we save our local state to the DB, sanity-check
      // it against what's currently there. If our copy looks like a sharp
      // shrink vs. the DB, we are the stale party (the very issue #127
      // failure mode) — abort the save, snapshot the DB row for safety,
      // and reload the remote instead of clobbering it.
      const remoteFactoryIds =
        (data?.factory_ids as unknown as string[] | null | undefined) ?? [];
      const localSerialized = serializeGame(gameId);
      const verdict = assessLocalVsRemote(localSerialized, remoteFactoryIds);

      if (verdict.suspiciousShrink) {
        logger.warn(
          `Local appears truncated vs DB (${verdict.previousFactoryCount} -> ${verdict.nextFactoryCount} factories). Aborting save and pulling DB.`,
        );
        // Snapshot the LOCAL state we're about to discard, not the
        // remote one (the remote stays in `games` regardless). If the
        // shrink heuristic was wrong and local was actually correct,
        // the user can recover from this snapshot.
        await snapshotRemote(
          savedId,
          'shrink-guard-dbfallback',
          localSerialized as unknown as never,
        );
        refs.isApplyingRemote.current = true;
        await loadRemoteGame(gameId, { override: true });
        refs.isApplyingRemote.current = false;
        return;
      }

      logger.info('Local is newer or equal, saving to DB (leader)');
      await saveRemoteGame(gameId, { silent: true });
    } catch (err) {
      logger.error('DB fallback reconciliation failed', err);
    }
  }, DB_FALLBACK_MS);
}

export function computeLeaderAndPeers(
  channel: RealtimeChannel,
  refs: SyncRefs,
) {
  const state = channel.presenceState<PresencePayload>();
  const senderIds: string[] = [];
  const peerMap: Record<string, PeerInfo> = {};

  for (const presences of Object.values(state)) {
    for (const p of presences) {
      if (!p.senderId) continue;
      senderIds.push(p.senderId);
      peerMap[p.senderId] = {
        senderId: p.senderId,
        userId: p.userId ?? '',
        avatarUrl: p.avatarUrl ?? null,
        displayName: p.displayName ?? 'Unknown',
        deviceName: p.deviceName ?? '',
        factoryId: p.factoryId ?? null,
      };
    }
  }

  senderIds.sort();
  const wasLeader = refs.isLeader.current;
  refs.isLeader.current = senderIds[0] === SENDER_ID;
  if (refs.isLeader.current !== wasLeader) {
    logger.info(
      refs.isLeader.current
        ? `Elected as leader (${senderIds.length} peers)`
        : `No longer leader (${senderIds.length} peers)`,
    );
  }

  useStore.getState().setPeers(peerMap);
}
