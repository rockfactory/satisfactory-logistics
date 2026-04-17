import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/auth/authSelectors';
import { useStore } from '@/core/zustand';
import { formatSavedAgo } from './formatSavedAgo';

export type GameSaveInfo =
  | { kind: 'local-only' }
  | { kind: 'saving' }
  | {
      kind: 'cloud-saved';
      updatedAt: string;
      relative: string;
      full: string;
    }
  | {
      kind: 'cloud-dirty';
      updatedAt: string | undefined;
      relative: string | null;
      full: string | null;
    }
  | { kind: 'cloud-pending' };

export function useGameSaveInfo(): GameSaveInfo {
  const session = useSession();
  const isSaving = useStore(s => s.gameSave.isSaving);
  const selectedGameId = useStore(s => s.games.selected);
  const dirtyAt = useStore(s =>
    selectedGameId ? (s.gameSave.dirtyAt[selectedGameId] ?? 0) : 0,
  );
  const savedId = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId]?.savedId : undefined,
  );
  const updatedAt = useStore(s =>
    selectedGameId ? s.games.games[selectedGameId]?.updatedAt : undefined,
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return useMemo<GameSaveInfo>(() => {
    if (!session) return { kind: 'local-only' };
    if (isSaving) return { kind: 'saving' };
    if (savedId && updatedAt) {
      const savedAtMs = new Date(updatedAt).getTime();
      const relative = formatSavedAgo(updatedAt, now);
      const full = dayjs(updatedAt).format('MMM D, YYYY HH:mm');
      if (dirtyAt > savedAtMs) {
        return { kind: 'cloud-dirty', updatedAt, relative, full };
      }
      return { kind: 'cloud-saved', updatedAt, relative, full };
    }
    return { kind: 'cloud-pending' };
  }, [session, isSaving, savedId, updatedAt, dirtyAt, now]);
}
