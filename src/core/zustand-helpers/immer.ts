import { enablePatches, type Patch } from 'immer';

enablePatches();

export const ImmerActions = '__immerActions';

export type PatchListener = (patches: Patch[]) => void;

const listeners = new Set<PatchListener>();

export function onStorePatches(listener: PatchListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitStorePatches(patches: Patch[]): void {
  for (const listener of listeners) {
    listener(patches);
  }
}
