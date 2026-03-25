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
  timestamp: number;
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
  const lastLocalEditRef = useRef(0);
  const lastReceivedTimestampRef = useRef(0);

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

        if (data.timestamp <= lastLocalEditRef.current) {
          logger.debug(
            `Ignoring stale remote sync (remote=${data.timestamp}, local=${lastLocalEditRef.current})`,
          );
          return;
        }

        logger.info('Received remote game sync');
        lastReceivedTimestampRef.current = data.timestamp;
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
    const unsubscribeStore = useStore.subscribe(() => {
      if (isApplyingRemoteRef.current) return;
      if (!channelRef.current) return;

      lastLocalEditRef.current = Date.now();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (!channelRef.current) return;

        if (lastLocalEditRef.current < lastReceivedTimestampRef.current) {
          logger.debug(
            'Skipping broadcast — no local edits since last received sync',
          );
          return;
        }

        try {
          const currentState = useStore.getState();
          const currentGame = currentState.games.games[gameId];
          if (!currentGame?.savedId) return;

          const serialized = serializeGame(gameId);
          const timestamp = lastLocalEditRef.current;
          const remoteData: Partial<GameRemoteData> = {
            id: currentGame.savedId,
            author_id: currentGame.authorId,
            created_at: currentGame.createdAt,
            share_token: currentGame.shareToken,
          };

          const payload: SyncBroadcastPayload = {
            senderId: SENDER_ID,
            timestamp,
            serialized,
            remoteData,
          };

          channelRef.current.send({
            type: 'broadcast',
            event: BROADCAST_EVENT,
            payload,
          });

          logger.debug(`Broadcasted game state (timestamp=${timestamp})`);
        } catch (err) {
          logger.error('Failed to broadcast game state', err);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribeStore();

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
