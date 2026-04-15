import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Patch } from 'immer';
import { useEffect, useRef, useState } from 'react';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { onStorePatches } from '@/core/zustand-helpers/immer';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { useCurrentFactoryId } from '@/notes/useNotesContext';
import { flushRemoteGameOnUnload } from './flushRemoteGameOnUnload';
import { hasOtherPeersConnectedOnChannel } from './peersSlice';
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
  isBroadcastSuppressed,
  isGamePatch,
  PATCH_DEBOUNCE_MS,
  type PatchBroadcastPayload,
  type PresencePayload,
  SENDER_ID,
} from './realtimeSyncTypes';
import { safeChannelSend } from './safeChannelSend';

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
  // Bumped to force the subscribe effect to re-run and recreate the channel
  // after CHANNEL_ERROR / CLOSED / TIMED_OUT. Reset on successful SUBSCRIBED.
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const reconnectAttemptsRef = useRef(0);

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
    logger.info(
      `Joining realtime channel: ${channelName} (epoch=${reconnectEpoch})`,
    );

    const channel = supabaseClient.channel(channelName, {
      config: { private: true },
    });
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
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let hasDirtySinceLastSave = false;
    // Set to true in the effect cleanup so the subscribe callback (which fires
    // with CLOSED when we voluntarily remove the channel) does not schedule a
    // reconnect loop. Only genuine errors while the effect is still active
    // should trigger a retry.
    let isCleaningUp = false;

    function scheduleReconnect() {
      if (isCleaningUp) return;
      if (reconnectTimer !== null) return;
      const attempt = reconnectAttemptsRef.current;
      // Exponential backoff capped at 30s: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      reconnectAttemptsRef.current = attempt + 1;
      logger.warn(
        `Scheduling realtime reconnect in ${delay}ms (attempt=${attempt + 1})`,
      );
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        setReconnectEpoch(e => e + 1);
      }, delay);
    }

    const doRequestFullState = () =>
      requestFullStateWithFallback(channel, gameId, refs, timers);

    function scheduleAutoSave() {
      if (!isLeaderRef.current) return;
      hasDirtySinceLastSave = true;
      if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        if (!isLeaderRef.current) return;
        if (!hasDirtySinceLastSave) return;
        hasDirtySinceLastSave = false;
        saveRemoteGame(gameId, { silent: true }).catch(err =>
          logger.error('Auto-save failed', err),
        );
      }, AUTO_SAVE_DEBOUNCE_MS);
    }

    function flushPatches() {
      flushTimer = null;
      if (!channelRef.current || pendingPatches.length === 0) return;

      if (!hasOtherPeersConnectedOnChannel(channelRef.current)) {
        pendingPatches = [];
        return;
      }

      seqRef.current += 1;
      const seq = seqRef.current;
      const batch = pendingPatches;
      pendingPatches = [];

      safeChannelSend({
        channel: channelRef.current,
        message: {
          type: 'broadcast',
          event: BROADCAST_EVENT,
          payload: {
            senderId: SENDER_ID,
            seq,
            patches: batch,
          } satisfies PatchBroadcastPayload,
        },
        context: `patch batch seq=${seq}`,
      });
      logger.debug(`Broadcasted ${batch.length} patches (seq=${seq})`);
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
          reconnectAttemptsRef.current = 0;
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
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'CLOSED' ||
          status === 'TIMED_OUT'
        ) {
          scheduleReconnect();
        }
      });

    channelRef.current = channel;

    // On abrupt tab close the React cleanup does not run and the autosave
    // debounce timer (up to AUTO_SAVE_DEBOUNCE_MS) is simply dropped, meaning
    // the DB stays stale until someone else saves. We flush a best-effort
    // keepalive save here so the leader does not leave pending edits unsaved.
    // Gated on leadership + dirtiness to avoid duplicate writes when multiple
    // peers close simultaneously.
    const onBeforeUnload = () => {
      if (!isLeaderRef.current) return;
      if (!hasDirtySinceLastSave) return;
      flushRemoteGameOnUnload(gameId);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const unsubscribePatches = onStorePatches(patches => {
      if (isApplyingRemoteRef.current || isBroadcastSuppressed()) return;
      if (!channelRef.current) return;

      const gamePatches = patches.filter(isGamePatch);
      if (gamePatches.length === 0) return;

      pendingPatches.push(...gamePatches);
      scheduleAutoSave();

      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = setTimeout(flushPatches, PATCH_DEBOUNCE_MS);
    });

    return () => {
      isCleaningUp = true;
      window.removeEventListener('beforeunload', onBeforeUnload);
      unsubscribePatches();
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushPatches();
      }
      if (autoSaveTimer !== null) {
        clearTimeout(autoSaveTimer);
        // Only the leader is allowed to persist on cleanup. Leadership can
        // change between scheduling and unmount (e.g. the timer was set while
        // we were leader, then a new peer joined and we lost it); in that case
        // the new leader will save and we must not stomp them with stale data.
        if (isLeaderRef.current && hasDirtySinceLastSave) {
          hasDirtySinceLastSave = false;
          saveRemoteGame(gameId, { silent: true }).catch(err =>
            logger.error('Auto-save on cleanup failed', err),
          );
        }
      }
      if (timers.dbFallback !== null) {
        clearTimeout(timers.dbFallback);
        timers.dbFallback = null;
      }
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (channelRef.current) {
        logger.info(`Leaving realtime channel: ${channelName}`);
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      useStore.getState().setRealtimeSyncConnected(false);
      useStore.getState().clearPeers();
    };
  }, [session, savedId, selectedGameId, reconnectEpoch]);
}
