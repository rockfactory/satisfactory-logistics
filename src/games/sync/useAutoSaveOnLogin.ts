import { useEffect, useRef } from 'react';
import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';

const logger = loglev.getLogger('games:auto-save-on-login');

export function useAutoSaveOnLogin() {
  const session = useStore(s => s.auth.session);
  const selectedGameId = useStore(s => s.games.selected);
  const savedId = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId]?.savedId : null,
  );

  const attemptedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session || !selectedGameId || savedId) return;

    const key = `${session.user.id}:${selectedGameId}`;
    if (attemptedKeyRef.current === key) return;
    attemptedKeyRef.current = key;

    logger.info(`Auto-saving game ${selectedGameId} after login`);
    saveRemoteGame(selectedGameId, { silent: true }).catch(err =>
      logger.error('Auto-save on login failed', err),
    );
  }, [session, selectedGameId, savedId]);
}
