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
  // Stable trigger: only re-run when the actual user changes. Supabase
  // rotates the session object on token refresh (including on tab visibility
  // change); depending on the full object here would tear down the hook on
  // every tab switch and reset HTTP presence to zero, which in turn closes
  // the websocket and restarts the whole dance.
  const sessionUserId = useStore(s => s.auth.session?.user?.id ?? null);
  const selectedGameId = useStore(s => s.games.selected);
  const savedId = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId]?.savedId : undefined,
  );

  useEffect(() => {
    if (!sessionUserId || !savedId || !selectedGameId) {
      useStore.getState().clearHttpPresence();
      return;
    }

    let disposed = false;
    let lastPollAt = 0;
    const inflightAborts = new Set<AbortController>();

    // The keepalive DELETE on beforeunload needs the raw access token
    // because the SDK doesn't support keepalive. We read imperatively so we
    // always pick up a freshly-refreshed token.
    const getToken = (): string | null =>
      useStore.getState().auth.session?.access_token ?? null;

    // Suppress network error logs entirely when the browser reports
    // offline: failures are expected and would flood the console on every
    // tick until connectivity returns.
    const logNetworkFailure = (context: string, err: unknown) => {
      if (!navigator.onLine) return;
      logger.warn(`${context} failed`, err);
    };

    async function doUpsert(): Promise<void> {
      try {
        await upsertPresence({
          savedId: savedId!,
          senderId: SENDER_ID,
          userId: sessionUserId!,
        });
      } catch (err) {
        logNetworkFailure('presence upsert', err);
      }
    }

    async function doPoll(): Promise<void> {
      const ac = new AbortController();
      inflightAborts.add(ac);
      try {
        const rows = await fetchPresence({
          savedId: savedId!,
          signal: ac.signal,
        });
        if (disposed) return;

        const otherSenderIds = new Set<string>();
        for (const row of rows) {
          if (row.sender_id === SENDER_ID) continue;
          otherSenderIds.add(row.sender_id);
        }

        const prev = useStore.getState().peers.httpPresence.otherSendersCount;
        const next = otherSenderIds.size;
        if (prev !== next) {
          logger.info(
            `poll: otherSendersCount ${prev} → ${next} (rows=${rows.length})`,
          );
        }
        useStore.getState().setHttpPresence({
          otherSendersCount: next,
        });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          logNetworkFailure('presence poll', err);
        }
      } finally {
        inflightAborts.delete(ac);
      }
    }

    // Opportunistic trigger used by visibility/focus/online events and by
    // external UI hooks (e.g. HoverCard open). Throttled so a burst of
    // events collapses into a single network round-trip. When withUpsert is
    // true, refresh our own row first — used on visibility returns where
    // the background-throttled heartbeat may have aged our row past the
    // TTL from other peers' point of view.
    function triggerPoll(withUpsert: boolean): void {
      const now = Date.now();
      if (now - lastPollAt < PRESENCE_OPPORTUNISTIC_MIN_GAP_MS) return;
      lastPollAt = now;
      if (withUpsert) {
        void doUpsert().then(() => {
          if (disposed) return;
          void doPoll();
        });
      } else {
        void doPoll();
      }
    }

    currentImmediatePoll = () => triggerPoll(false);

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
      if (document.visibilityState === 'visible') triggerPoll(true);
    };
    const onOnline = () => triggerPoll(true);
    // Window focus catches cases where the user alt-tabs or clicks on the
    // window without changing visibility state (e.g. switching between apps).
    const onFocus = () => triggerPoll(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);

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
      currentImmediatePoll = null;
      clearInterval(tickTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
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
  }, [sessionUserId, savedId, selectedGameId]);
}
