import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import type { GameRemoteData } from '@/games/Game';
import {
  type SerializedGame,
  serializeGame,
} from '@/games/store/gameFactoriesActions';

const logger = loglev.getLogger('games:realtime-sync');

const SENDER_ID = crypto.randomUUID();
const DEBOUNCE_MS = 1000;
const BROADCAST_EVENT = 'game:sync';

interface SyncBroadcastPayload {
  senderId: string;
  updatedAt: string;
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const lastBroadcastUpdatedAtRef = useRef<string | null>(null);

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

    channel
      .on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
        const data = payload as SyncBroadcastPayload;
        if (data.senderId === SENDER_ID) return;

        const localGame = useStore.getState().games.games[selectedGameId];
        const localUpdatedAt = localGame?.updatedAt;

        if (localUpdatedAt && data.updatedAt <= localUpdatedAt) {
          logger.debug(
            `Ignoring stale remote sync (remote=${data.updatedAt}, local=${localUpdatedAt})`,
          );
          return;
        }

        logger.info(
          `Accepting remote sync (remote=${data.updatedAt}, local=${localUpdatedAt ?? 'none'})`,
        );
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
      });

    channelRef.current = channel;

    const gameId = selectedGameId;
    let initializedAt: string | null = null;

    // Snapshot updatedAt at mount time so we can distinguish real user edits
    // from the initial hydration / remote-load store changes.
    const snapshotUpdatedAt =
      useStore.getState().games.games[gameId]?.updatedAt ?? null;
    // Delay subscription to skip initial mount/hydration store notifications
    const initTimer = setTimeout(() => {
      initializedAt = snapshotUpdatedAt;
    }, 100);

    const unsubscribeStore = useStore.subscribe(() => {
      if (isApplyingRemoteRef.current) return;
      if (!channelRef.current) return;
      if (initializedAt === null) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (!channelRef.current) return;

        const latestGame = useStore.getState().games.games[gameId];
        if (!latestGame?.savedId) return;

        const updatedAt = new Date().toISOString();
        const serialized = serializeGame(gameId);
        const remoteData: Partial<GameRemoteData> = {
          id: latestGame.savedId,
          author_id: latestGame.authorId,
          created_at: latestGame.createdAt,
          updated_at: updatedAt,
          share_token: latestGame.shareToken,
        };

        const payload: SyncBroadcastPayload = {
          senderId: SENDER_ID,
          updatedAt,
          serialized,
          remoteData,
        };

        try {
          channelRef.current.send({
            type: 'broadcast',
            event: BROADCAST_EVENT,
            payload,
          });

          lastBroadcastUpdatedAtRef.current = updatedAt;
          useStore.getState().games.games[gameId].updatedAt = updatedAt;
          logger.debug(`Broadcasted game state (updatedAt=${updatedAt})`);
        } catch (err) {
          logger.error('Failed to broadcast game state', err);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribeStore();
      clearTimeout(initTimer);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
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
