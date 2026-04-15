import { enablePatches, type Patch } from 'immer';

enablePatches();

export const ImmerActions = '__immerActions';

export type PatchListener = (patches: Patch[]) => void;

const listeners = new Set<PatchListener>();

export function onPatches(listener: PatchListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPatches(patches: Patch[]): void {
  for (const listener of listeners) {
    listener(patches);
  }
}
