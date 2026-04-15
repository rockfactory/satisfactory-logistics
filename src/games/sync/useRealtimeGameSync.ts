import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Patch } from 'immer';
import { useEffect, useRef } from 'react';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { onStorePatches } from '@/core/zustand-helpers/immer';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { useCurrentFactoryId } from '@/notes/useNotesContext';
import {
  computeLeaderAndPeers,
  handleFullStateRequest,
  handleFullStateResponse,
  handleIncomingPatches,
  requestFullStateWithFallback,
  type SyncRefs,
  type SyncTimers,
} from './realtimeSyncHandlers';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  BROADCAST_EVENT,
  BROADCAST_FULL_REQUEST,
  BROADCAST_FULL_RESPONSE,
  type FullStateRequestPayload,
  type FullStateResponsePayload,
  isGamePatch,
  PATCH_DEBOUNCE_MS,
  type PatchBroadcastPayload,
  type PresencePayload,
  SENDER_ID,
} from './realtimeSyncTypes';

const logger = loglev.getLogger('games:realtime-sync');

export function useRealtimeGameSync() {
  const session = useStore(s => s.auth.session);
  const selectedGameId = useStore(s => s.games.selected);
  const game = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId] : null,
  );
  const savedId = game?.savedId;
  const factoryId = useCurrentFactoryId();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const seqRef = useRef(0);
  const isLeaderRef = useRef(false);
  const factoryIdRef = useRef(factoryId);
  factoryIdRef.current = factoryId;

  useEffect(() => {
    if (!channelRef.current || !session) return;
    const user = session.user;
    const payload: PresencePayload = {
      senderId: SENDER_ID,
      userId: user.id,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      displayName:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'Unknown',
      factoryId,
    };
    channelRef.current.track(payload);
  }, [factoryId, session]);

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
    const refs: SyncRefs = {
      isApplyingRemote: isApplyingRemoteRef,
      isLeader: isLeaderRef,
      seq: seqRef,
    };
    const timers: SyncTimers = { dbFallback: null };

    let pendingPatches: Patch[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

    const doRequestFullState = () =>
      requestFullStateWithFallback(channel, gameId, refs, timers);

    function scheduleAutoSave() {
      if (!isLeaderRef.current) return;
      if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        if (!isLeaderRef.current) return;
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

    channel
      .on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
        handleIncomingPatches(
          payload as PatchBroadcastPayload,
          remoteSeqs,
          refs,
          doRequestFullState,
        );
      })
      .on('broadcast', { event: BROADCAST_FULL_REQUEST }, ({ payload }) => {
        handleFullStateRequest(
          payload as FullStateRequestPayload,
          channel,
          gameId,
          refs,
        );
      })
      .on('broadcast', { event: BROADCAST_FULL_RESPONSE }, ({ payload }) => {
        handleFullStateResponse(
          payload as FullStateResponsePayload,
          remoteSeqs,
          refs,
          timers,
        );
      })
      .on('presence', { event: 'sync' }, () => {
        computeLeaderAndPeers(channel, refs);
      })
      .subscribe(async status => {
        logger.info(`Realtime channel status: ${status}`);
        useStore.getState().setRealtimeSyncConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          const user = session.user;
          await channel.track({
            senderId: SENDER_ID,
            userId: user.id,
            avatarUrl: user.user_metadata?.avatar_url ?? null,
            displayName:
              user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              'Unknown',
            factoryId: factoryIdRef.current,
          } satisfies PresencePayload);
          doRequestFullState();
        }
      });

    channelRef.current = channel;

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
      if (timers.dbFallback !== null) {
        clearTimeout(timers.dbFallback);
        timers.dbFallback = null;
      }

      if (channelRef.current) {
        logger.info(`Leaving realtime channel: ${channelName}`);
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      useStore.getState().setRealtimeSyncConnected(false);
      useStore.getState().clearPeers();
    };
  }, [session, savedId, selectedGameId]);
}
