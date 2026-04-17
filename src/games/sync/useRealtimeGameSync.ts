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
  ALONE_DOWNGRADE_MS,
  AUTO_SAVE_DEBOUNCE_MS,
  BROADCAST_EVENT,
  BROADCAST_FULL_REQUEST,
  BROADCAST_FULL_RESPONSE,
  DEVICE_NAME,
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
  // Track a STABLE identifier of the logged-in user, not the session object
  // itself. Supabase rotates the session reference on token refresh (which
  // it does on tab visibility change), and depending on the full object
  // would tear down every effect on every tab switch. The hook body reads
  // the current `session` via `useStore.getState().auth.session` when it
  // needs the latest access_token.
  const sessionUserId = useStore(s => s.auth.session?.user?.id ?? null);
  const selectedGameId = useStore(s => s.games.selected);
  const game = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId] : null,
  );
  const savedId = game?.savedId;
  const factoryId = useCurrentFactoryId();

  // Gate for the realtime channel: when zero, stay in HTTP-only mode
  // (auto-save still works; no websocket slot consumed). Driven by the
  // useGamePresence hook polling game_presence every ~45s. Counts ANY other
  // sender (different user OR different tab/device of the same user), so
  // cross-tab realtime sync keeps working for a single logged-in user.
  const httpOtherSendersCount = useStore(
    s => s.peers.httpPresence.otherSendersCount,
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const seqRef = useRef(0);
  const isLeaderRef = useRef(false);
  const factoryIdRef = useRef(factoryId);
  factoryIdRef.current = factoryId;

  // Cross-effect buffers: these must survive channel-lifecycle teardown so we
  // don't drop pending edits when the user goes solo -> peer -> solo.
  const pendingPatchesRef = useRef<Patch[]>([]);
  const hasDirtyRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bumped to force the subscribe effect to re-run and recreate the channel
  // after CHANNEL_ERROR / CLOSED / TIMED_OUT. Reset on successful SUBSCRIBED.
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionUserId) return;
    const session = useStore.getState().auth.session;
    if (!channelRef.current || !session) return;
    const user = session.user;
    const payload: PresencePayload = {
      senderId: SENDER_ID,
      userId: user.id,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      displayName:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'Unknown',
      deviceName: DEVICE_NAME,
      factoryId,
    };
    channelRef.current.track(payload);
  }, [factoryId, sessionUserId]);

  // Effect 1 — always on while preconditions hold. Owns patch accumulation,
  // auto-save scheduling, and the last-chance save on tab close. Runs
  // regardless of whether a websocket channel is open, so a solo user still
  // gets HTTP auto-save and never loses edits across channel open/close
  // transitions driven by HTTP presence flips.
  useEffect(() => {
    if (!sessionUserId || !savedId || !selectedGameId) return;
    const gameId = selectedGameId;
    logger.debug(
      `[effect autosave] run sessionUserId=${sessionUserId} savedId=${savedId} selectedGameId=${selectedGameId}`,
    );

    // Leader when the websocket is open: defer to presence-based election
    // (computeLeaderAndPeers). When HTTP-only, any other sender would have
    // triggered a websocket open via the gate, so HTTP-only == truly alone
    // == we are the leader.
    function isEffectiveLeader(): boolean {
      if (channelRef.current) return isLeaderRef.current;
      return true;
    }

    function flushPatches(): void {
      flushTimerRef.current = null;
      if (pendingPatchesRef.current.length === 0) return;

      // No channel, or we're alone on the channel: drop the batch. The
      // corresponding state is already in the zustand store and will be
      // persisted by the auto-save path.
      if (
        !channelRef.current ||
        !hasOtherPeersConnectedOnChannel(channelRef.current)
      ) {
        pendingPatchesRef.current = [];
        return;
      }

      seqRef.current += 1;
      const seq = seqRef.current;
      const batch = pendingPatchesRef.current;
      pendingPatchesRef.current = [];

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

    function scheduleAutoSave(): void {
      if (!isEffectiveLeader()) return;
      hasDirtyRef.current = true;
      if (autoSaveTimerRef.current !== null) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null;
        if (!isEffectiveLeader()) return;
        if (!hasDirtyRef.current) return;
        hasDirtyRef.current = false;
        saveRemoteGame(gameId, { silent: true }).catch(err =>
          logger.error('Auto-save failed', err),
        );
      }, AUTO_SAVE_DEBOUNCE_MS);
    }

    const unsubscribePatches = onStorePatches(patches => {
      if (isApplyingRemoteRef.current || isBroadcastSuppressed()) return;

      const gamePatches = patches.filter(isGamePatch);
      if (gamePatches.length === 0) return;

      pendingPatchesRef.current.push(...gamePatches);
      scheduleAutoSave();

      if (flushTimerRef.current !== null) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushPatches, PATCH_DEBOUNCE_MS);
    });

    // On abrupt tab close the React cleanup does not run and the autosave
    // debounce timer (up to AUTO_SAVE_DEBOUNCE_MS) is simply dropped, meaning
    // the DB stays stale until someone else saves. We flush a best-effort
    // keepalive save here so the leader does not leave pending edits unsaved.
    const onBeforeUnload = () => {
      if (!isEffectiveLeader()) return;
      if (!hasDirtyRef.current) return;
      flushRemoteGameOnUnload(gameId);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      logger.debug(
        `[effect autosave] cleanup sessionUserId=${sessionUserId} savedId=${savedId} selectedGameId=${selectedGameId}`,
      );
      window.removeEventListener('beforeunload', onBeforeUnload);
      unsubscribePatches();
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
        flushPatches();
      }
      if (autoSaveTimerRef.current !== null) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
        // Leadership can change between scheduling and unmount (e.g. the
        // timer was set while we were leader, then a new peer joined and
        // took over); in that case the new leader will save and we must not
        // stomp them. Also skip if the game was deleted while the timer was
        // pending — saveRemoteGame would fail on a missing game.
        if (isEffectiveLeader() && hasDirtyRef.current) {
          hasDirtyRef.current = false;
          const gameStillExists = !!useStore.getState().games.games[gameId];
          if (gameStillExists) {
            saveRemoteGame(gameId, { silent: true }).catch(err =>
              logger.error('Auto-save on cleanup failed', err),
            );
          } else {
            logger.info(
              `Skipping cleanup save: game ${gameId} no longer exists`,
            );
          }
        }
      }
      pendingPatchesRef.current = [];
      hasDirtyRef.current = false;
    };
  }, [sessionUserId, savedId, selectedGameId]);

  // Effect 2 — realtime channel lifecycle. Only opens a websocket when the
  // HTTP presence poll detects another user on the same save. When the poll
  // drops to zero, we close the channel and stay in HTTP-only mode, freeing
  // a Supabase realtime slot. A peer returning (or joining for the first
  // time) flips the gate and re-opens the channel.
  useEffect(() => {
    logger.debug(
      `[effect channel] run sessionUserId=${sessionUserId ?? 'none'} savedId=${savedId ?? 'none'} selectedGameId=${selectedGameId ?? 'none'} epoch=${reconnectEpoch}`,
    );
    const session = useStore.getState().auth.session;
    if (!session || !sessionUserId || !savedId || !selectedGameId) {
      if (channelRef.current) {
        logger.info('Leaving realtime channel (preconditions lost)');
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
        useStore.getState().setRealtimeSyncConnected(false);
        useStore.getState().clearPeers();
      }
      return;
    }

    // Read HTTP presence imperatively (NOT as a dep) so transient flaps from
    // background-tab throttling don't tear down the channel. The separate
    // alone-downgrade effect below owns the "close due to HTTP" decision.
    const currentHttpOthers =
      useStore.getState().peers.httpPresence.otherSendersCount;
    logger.debug(
      `[effect channel] currentHttpOthers=${currentHttpOthers} channelPresent=${channelRef.current !== null}`,
    );
    if (currentHttpOthers === 0) {
      return;
    }

    const channelName = `game:${savedId}`;
    logger.info(
      `Joining realtime channel: ${channelName} (epoch=${reconnectEpoch}, httpPeers=${currentHttpOthers})`,
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

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
            deviceName: DEVICE_NAME,
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

    // Supabase's channel heartbeat can take 30s+ to detect a dead WebSocket,
    // so we flip the sync-connected flag off immediately when the browser
    // reports offline, and force an early reconnect attempt when it comes back.
    const onOffline = () => {
      logger.warn('Browser went offline: marking sync disconnected');
      useStore.getState().setRealtimeSyncConnected(false);
    };

    const onOnline = () => {
      logger.info('Browser back online: forcing reconnect');
      reconnectAttemptsRef.current = 0;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      setReconnectEpoch(e => e + 1);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      logger.debug(
        `[effect channel] cleanup sessionUserId=${sessionUserId ?? 'none'} savedId=${savedId ?? 'none'} selectedGameId=${selectedGameId ?? 'none'} epoch=${reconnectEpoch}`,
      );
      isCleaningUp = true;
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
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
      isLeaderRef.current = false;
    };
  }, [sessionUserId, savedId, selectedGameId, reconnectEpoch]);

  // HTTP-presence gate, decoupled from the channel effect so count flips
  // don't recycle the channel. Rules:
  //  - HTTP sees another sender and we have no channel → trigger reconnect
  //    (channel effect will read fresh count and open).
  //  - HTTP says we're alone AND a channel is open → start a grace timer;
  //    if still alone and the WS also has no peers when it fires, close the
  //    channel. This absorbs background-tab throttling and brief network
  //    blips that would otherwise produce an open→close→open storm.
  useEffect(() => {
    logger.debug(
      `[effect http-gate] run httpOtherSendersCount=${httpOtherSendersCount} channelPresent=${channelRef.current !== null}`,
    );
    if (!sessionUserId || !savedId || !selectedGameId) return;

    if (httpOtherSendersCount > 0) {
      if (!channelRef.current) {
        logger.info(
          '[effect http-gate] peer detected, no channel yet → bumping reconnectEpoch',
        );
        setReconnectEpoch(e => e + 1);
      }
      return;
    }

    if (!channelRef.current) return;

    logger.info(
      `[effect http-gate] alone on HTTP, channel still open → starting ${ALONE_DOWNGRADE_MS}ms grace timer`,
    );
    const timer = setTimeout(() => {
      if (!channelRef.current) return;
      if (hasOtherPeersConnectedOnChannel(channelRef.current)) {
        logger.info(
          '[effect http-gate] grace expired but WS still has peers; keeping channel',
        );
        return;
      }
      logger.info(
        `[effect http-gate] grace expired, closing channel (alone on HTTP + WS for ${ALONE_DOWNGRADE_MS}ms)`,
      );
      supabaseClient.removeChannel(channelRef.current);
      channelRef.current = null;
      useStore.getState().setRealtimeSyncConnected(false);
      useStore.getState().clearPeers();
      isLeaderRef.current = false;
    }, ALONE_DOWNGRADE_MS);

    return () => {
      logger.debug('[effect http-gate] cleanup (clearing grace timer)');
      clearTimeout(timer);
    };
  }, [sessionUserId, savedId, selectedGameId, httpOtherSendersCount]);
}
