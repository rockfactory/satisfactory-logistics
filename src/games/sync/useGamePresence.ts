import { useEffect } from 'react';
import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import {
  deletePresenceOnUnload,
  fetchPresence,
  upsertPresence,
} from './gamePresenceClient';
import {
  PRESENCE_OPPORTUNISTIC_MIN_GAP_MS,
  PRESENCE_TICK_MS,
  SENDER_ID,
} from './realtimeSyncTypes';

const logger = loglev.getLogger('games:presence-http');

// Module-level reference to the active hook's "poll now" function. Set while
// the hook is mounted; cleared on unmount. UI code (e.g. HoverCard open) calls
// triggerImmediatePresencePoll() to nudge a fresh poll out of cadence. The
// throttle lives inside the hook so duplicate invocations within
// PRESENCE_OPPORTUNISTIC_MIN_GAP_MS collapse into a single request.
let currentImmediatePoll: (() => void) | null = null;

export function triggerImmediatePresencePoll(): void {
  currentImmediatePoll?.();
}

export function useGamePresence(): void {
  const session = useStore(s => s.auth.session);
  const selectedGameId = useStore(s => s.games.selected);
  const savedId = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId]?.savedId : undefined,
  );

  useEffect(() => {
    if (!session || !savedId || !selectedGameId) {
      useStore.getState().clearHttpPresence();
      return;
    }

    const userId = session.user.id;
    let disposed = false;
    let lastPollAt = 0;
    const inflightAborts = new Set<AbortController>();

    // Read the current access token on every call in case it rotates between
    // the effect starting and a later tick. Session changes re-run the effect
    // (dependency below), so this is belt-and-suspenders.
    const getToken = () =>
      useStore.getState().auth.session?.access_token ?? session.access_token;

    async function doUpsert(): Promise<void> {
      try {
        await upsertPresence({
          savedId: savedId!,
          senderId: SENDER_ID,
          userId,
          accessToken: getToken(),
        });
      } catch (err) {
        logger.warn('presence upsert failed', err);
      }
    }

    async function doPoll(): Promise<void> {
      const ac = new AbortController();
      inflightAborts.add(ac);
      try {
        const rows = await fetchPresence({
          savedId: savedId!,
          accessToken: getToken(),
          signal: ac.signal,
        });
        if (disposed) return;

        const otherSenderIds = new Set<string>();
        for (const row of rows) {
          if (row.sender_id === SENDER_ID) continue;
          otherSenderIds.add(row.sender_id);
        }

        useStore.getState().setHttpPresence({
          otherSendersCount: otherSenderIds.size,
        });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          logger.warn('presence poll failed', err);
        }
      } finally {
        inflightAborts.delete(ac);
      }
    }

    function triggerImmediate(): void {
      const now = Date.now();
      if (now - lastPollAt < PRESENCE_OPPORTUNISTIC_MIN_GAP_MS) return;
      lastPollAt = now;
      void doPoll();
    }

    // When coming back from a hidden tab, the background-throttled heartbeat
    // may have aged our row past the TTL from other peers' point of view.
    // Refresh our own row first, THEN poll, so we catch up and they see us
    // on their next poll.
    function triggerImmediateWithUpsert(): void {
      const now = Date.now();
      if (now - lastPollAt < PRESENCE_OPPORTUNISTIC_MIN_GAP_MS) return;
      lastPollAt = now;
      void doUpsert().then(() => {
        if (disposed) return;
        void doPoll();
      });
    }

    currentImmediatePoll = triggerImmediate;

    // Initial burst: upsert first (so other peers polling right now can see
    // us), then poll (so we learn about peers already there).
    void doUpsert().then(() => {
      if (disposed) return;
      lastPollAt = Date.now();
      void doPoll();
    });

    const tickTimer = setInterval(() => {
      void doUpsert();
      lastPollAt = Date.now();
      void doPoll();
    }, PRESENCE_TICK_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') triggerImmediateWithUpsert();
    };
    const onOnline = () => triggerImmediateWithUpsert();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    const onBeforeUnload = () => {
      const token = getToken();
      if (!token) return;
      deletePresenceOnUnload({
        savedId: savedId!,
        senderId: SENDER_ID,
        accessToken: token,
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      disposed = true;
      if (currentImmediatePoll === triggerImmediate)
        currentImmediatePoll = null;
      clearInterval(tickTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeunload', onBeforeUnload);
      for (const ac of inflightAborts) ac.abort();
      inflightAborts.clear();
      useStore.getState().clearHttpPresence();
      // Best-effort delete so peers see us gone within seconds instead of
      // waiting for the TTL to expire. Fire-and-forget.
      const token = getToken();
      if (token) {
        deletePresenceOnUnload({
          savedId: savedId!,
          senderId: SENDER_ID,
          accessToken: token,
        });
      }
    };
  }, [session, savedId, selectedGameId]);
}
