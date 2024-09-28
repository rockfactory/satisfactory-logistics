import { useSyncLocalAndRemoteStore } from './useSyncLocalAndRemoteStore';

export interface ISyncManagerProps {}

export function SyncManager(props: ISyncManagerProps) {
  useSyncLocalAndRemoteStore();

  return null;
}
