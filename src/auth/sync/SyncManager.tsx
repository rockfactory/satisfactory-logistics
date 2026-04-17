import { useTrackGameDirty } from '@/games/save/useTrackGameDirty';
import { useAutoSaveOnLogin } from '@/games/sync/useAutoSaveOnLogin';
import { useGamePresence } from '@/games/sync/useGamePresence';
import { useRealtimeGameSync } from '@/games/sync/useRealtimeGameSync';

export interface ISyncManagerProps {}

export function SyncManager(props: ISyncManagerProps) {
  useAutoSaveOnLogin();
  useGamePresence();
  useRealtimeGameSync();
  useTrackGameDirty();

  return null;
}
