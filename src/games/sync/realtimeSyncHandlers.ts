import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyPatches } from 'immer';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import type { GameRemoteData } from '@/games/Game';
import { loadRemoteGame } from '@/games/save/loadRemoteGame';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { serializeGame } from '@/games/store/gameFactoriesActions';
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
} from './realtimeSyncTypes';

const logger = loglev.getLogger('games:realtime-sync');

export interface SyncRefs {
  isApplyingRemote: { current: boolean };
  isLeader: { current: boolean };
  seq: { current: number };
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
    const currentState = useStore.getState();
    const nextState = applyPatches(currentState, data.patches);
    useStore.setState(nextState);
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

    channel.send({
      type: 'broadcast',
      event: BROADCAST_FULL_RESPONSE,
      payload: {
        senderId: SENDER_ID,
        seq: refs.seq.current,
        serialized,
        remoteData,
      } satisfies FullStateResponsePayload,
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
  refs.isApplyingRemote.current = true;
  try {
    useStore.getState().loadRemoteGame(data.serialized, data.remoteData, {
      override: true,
    });
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
  channel.send({
    type: 'broadcast',
    event: BROADCAST_FULL_REQUEST,
    payload: { senderId: SENDER_ID } satisfies FullStateRequestPayload,
  });

  if (timers.dbFallback !== null) clearTimeout(timers.dbFallback);
  timers.dbFallback = setTimeout(async () => {
    timers.dbFallback = null;
    logger.info('No peer response, reconciling with database');
    try {
      const localGame = useStore.getState().games.games[gameId];
      const savedId = localGame?.savedId;
      if (!savedId) return;

      const { data, error } = await supabaseClient
        .from('games')
        .select('updated_at')
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
      } else if (refs.isLeader.current) {
        logger.info('Local is newer or equal, saving to DB (leader)');
        await saveRemoteGame(gameId, { silent: true });
      } else {
        logger.info('Local is newer or equal, skipping save (not leader)');
      }
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
      if (p.senderId !== SENDER_ID) {
        peerMap[p.senderId] = {
          senderId: p.senderId,
          userId: p.userId ?? '',
          avatarUrl: p.avatarUrl ?? null,
          displayName: p.displayName ?? 'Unknown',
          factoryId: p.factoryId ?? null,
        };
      }
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
