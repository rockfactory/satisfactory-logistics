import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyPatches, type Patch } from 'immer';
import { useEffect, useRef } from 'react';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { onStorePatches } from '@/core/zustand-helpers/immer';
import type { GameRemoteData } from '@/games/Game';
import { loadRemoteGame } from '@/games/save/loadRemoteGame';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import {
  type SerializedGame,
  serializeGame,
} from '@/games/store/gameFactoriesActions';

const logger = loglev.getLogger('games:realtime-sync');

const SENDER_ID = crypto.randomUUID();
const PATCH_DEBOUNCE_MS = 150;
const AUTO_SAVE_DEBOUNCE_MS = 60_000;
const DB_FALLBACK_MS = 3_000;
const BROADCAST_EVENT = 'game:patch';
const BROADCAST_FULL_REQUEST = 'game:full-request';
const BROADCAST_FULL_RESPONSE = 'game:full-response';

const GAME_SLICES = new Set(['games', 'factories', 'solvers']);

const IGNORED_GAME_PATHS = new Set(['selected']);

function isGamePatch(patch: Patch): boolean {
  const { path } = patch;
  if (typeof path[0] !== 'string' || !GAME_SLICES.has(path[0])) return false;
  if (path[0] === 'games' && IGNORED_GAME_PATHS.has(path[1] as string))
    return false;
  return true;
}

interface PatchBroadcastPayload {
  senderId: string;
  seq: number;
  patches: Patch[];
}

interface FullStateRequestPayload {
  senderId: string;
}

interface FullStateResponsePayload {
  senderId: string;
  seq: number;
  serialized: SerializedGame;
  remoteData: Partial<GameRemoteData>;
}

export function useRealtimeGameSync() {
  const session = useStore(s => s.auth.session);
  const selectedGameId = useStore(s => s.games.selected);
  const game = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId] : null,
  );
  const savedId = game?.savedId;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!session || !savedId || !selectedGameId) {
      if (channelRef.current) {
        logger.info('Leaving realtime channel (preconditions lost)');
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channelName = `game:${savedId}`;
    logger.info(`Joining realtime channel: ${channelName}`);

    const channel = supabaseClient.channel(channelName);
    const gameId = selectedGameId;
    const remoteSeqs = new Map<string, number>();
    let dbFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    function requestFullStateWithFallback() {
      channel.send({
        type: 'broadcast',
        event: BROADCAST_FULL_REQUEST,
        payload: { senderId: SENDER_ID } satisfies FullStateRequestPayload,
      });

      if (dbFallbackTimer !== null) clearTimeout(dbFallbackTimer);
      dbFallbackTimer = setTimeout(async () => {
        dbFallbackTimer = null;
        logger.info(
          'No peer response, saving local state then loading from database',
        );
        try {
          await saveRemoteGame(gameId, { silent: true });
        } catch (err) {
          logger.error('Pre-fallback save failed', err);
        }
        isApplyingRemoteRef.current = true;
        loadRemoteGame(gameId, { override: true }).finally(() => {
          isApplyingRemoteRef.current = false;
        });
      }, DB_FALLBACK_MS);
    }

    channel
      .on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
        const data = payload as PatchBroadcastPayload;
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
          requestFullStateWithFallback();
          remoteSeqs.set(data.senderId, data.seq);
          return;
        }

        remoteSeqs.set(data.senderId, data.seq);
        logger.debug(
          `Applying ${data.patches.length} remote patches (seq=${data.seq})`,
        );
        isApplyingRemoteRef.current = true;
        try {
          const currentState = useStore.getState();
          const nextState = applyPatches(currentState, data.patches);
          useStore.setState(nextState);
        } catch (err) {
          logger.error('Failed to apply patches, requesting full state', err);
          requestFullStateWithFallback();
        } finally {
          isApplyingRemoteRef.current = false;
        }
      })
      .on('broadcast', { event: BROADCAST_FULL_REQUEST }, ({ payload }) => {
        const data = payload as FullStateRequestPayload;
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
              seq: seqRef.current,
              serialized,
              remoteData,
            } satisfies FullStateResponsePayload,
          });
        } catch (err) {
          logger.error('Failed to send full state response', err);
        }
      })
      .on('broadcast', { event: BROADCAST_FULL_RESPONSE }, ({ payload }) => {
        const data = payload as FullStateResponsePayload;
        if (data.senderId === SENDER_ID) return;

        if (dbFallbackTimer !== null) {
          clearTimeout(dbFallbackTimer);
          dbFallbackTimer = null;
        }

        logger.info(`Received full state response (seq=${data.seq}), applying`);
        remoteSeqs.set(data.senderId, data.seq);
        isApplyingRemoteRef.current = true;
        try {
          useStore.getState().loadRemoteGame(data.serialized, data.remoteData, {
            override: true,
          });
        } finally {
          isApplyingRemoteRef.current = false;
        }
      })
      .subscribe(status => {
        logger.info(`Realtime channel status: ${status}`);
        useStore.getState().setRealtimeSyncConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          requestFullStateWithFallback();
        }
      });

    channelRef.current = channel;

    let pendingPatches: Patch[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleAutoSave() {
      if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        saveRemoteGame(gameId, { silent: true }).catch(err =>
          logger.error('Auto-save failed', err),
        );
      }, AUTO_SAVE_DEBOUNCE_MS);
    }

    function flushPatches() {
      flushTimer = null;
      if (!channelRef.current || pendingPatches.length === 0) return;

      seqRef.current += 1;
      const seq = seqRef.current;
      const batch = pendingPatches;
      pendingPatches = [];

      try {
        channelRef.current.send({
          type: 'broadcast',
          event: BROADCAST_EVENT,
          payload: {
            senderId: SENDER_ID,
            seq,
            patches: batch,
          } satisfies PatchBroadcastPayload,
        });
        logger.debug(`Broadcasted ${batch.length} patches (seq=${seq})`);
      } catch (err) {
        logger.error('Failed to broadcast patches', err);
      }
    }

    const unsubscribePatches = onStorePatches(patches => {
      if (isApplyingRemoteRef.current) return;
      if (!channelRef.current) return;

      const gamePatches = patches.filter(isGamePatch);
      if (gamePatches.length === 0) return;

      pendingPatches.push(...gamePatches);
      scheduleAutoSave();

      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = setTimeout(flushPatches, PATCH_DEBOUNCE_MS);
    });

    return () => {
      unsubscribePatches();
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushPatches();
      }
      if (autoSaveTimer !== null) {
        clearTimeout(autoSaveTimer);
        saveRemoteGame(gameId, { silent: true }).catch(err =>
          logger.error('Auto-save on cleanup failed', err),
        );
      }
      if (dbFallbackTimer !== null) {
        clearTimeout(dbFallbackTimer);
        dbFallbackTimer = null;
      }

      if (channelRef.current) {
        logger.info(`Leaving realtime channel: ${channelName}`);
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      useStore.getState().setRealtimeSyncConnected(false);
    };
  }, [session, savedId, selectedGameId]);
}
