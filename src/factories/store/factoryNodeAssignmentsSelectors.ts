import { useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { WORLD_SOURCE_ID } from '@/factories/Factory';
import {
  getWorldResourceNodes,
  type WorldResourceNode,
} from '@/recipes/WorldResourceNodes';

// Control-char separators: cannot appear in factory ids, node ids, or
// factory names, so `split` round-trips cleanly. Same trick used in
// factoriesSelectors.ts to encode a stable string signature for shallow
// compare in zustand.
const SIG_SEP = '\u0001';
const FIELD_SEP = '\u0002';

export interface NodeAssignmentRef {
  factoryId: string;
  factoryName: string | null;
  inputIndex: number;
  resource: string;
}

/**
 * Returns a `nodeId -> NodeAssignmentRef[]` map for the given game.
 *
 * Filters at read time (never mutates persisted state):
 * - drops node ids not present in the (possibly savegame-overridden)
 *   resource node set, so dangling assignments after a randomizer
 *   import degrade silently;
 * - drops assignments whose `input.resource` doesn't match the
 *   `node.resource`, so changing the resource on an input auto-clears
 *   the visual.
 *
 * The first `useStore` builds a stringified signature so the consuming
 * `useMemo` only recomputes on semantic changes (returning a fresh
 * object directly would defeat shallow compare and cause render loops
 * downstream).
 */
export const useNodeAssignments = (
  gameId: string | null | undefined,
): Record<string, NodeAssignmentRef[]> => {
  // Subscribe to savegame overrides separately: `getWorldResourceNodes`
  // reads them via `getState()` synchronously, so without an explicit
  // dep this would not re-run after a `.sav` import.
  const savegameOverrides = useStore(state =>
    gameId ? state.games.games[gameId]?.savegameNodeOverrides : undefined,
  );

  // ─── Signature pass: walk every factory's inputs in the current game
  //     and emit one row per (input, nodeId) pair. The output is a
  //     plain string compared by `===` for the next render decision.
  const signature = useStore(state => {
    if (!gameId) return '';
    const game = state.games.games[gameId];
    if (!game) return '';

    const parts: string[] = [];
    for (const factoryId of game.factoriesIds ?? []) {
      const factory = state.factories.factories[factoryId];
      if (!factory) continue;

      // Same defensive `?.` as in factoriesSelectors.ts: legacy
      // factories may persist without an `inputs` array.
      factory.inputs?.forEach((input, inputIndex) => {
        // Only World inputs can have node assignments.
        if (input.factoryId !== WORLD_SOURCE_ID) return;
        if (!input.nodeIds || input.nodeIds.length === 0) return;
        if (!input.resource) return;

        // One row per assigned node — the resolution step below joins
        // each row back to a NodeAssignmentRef.
        for (const nodeId of input.nodeIds) {
          parts.push(
            [
              nodeId,
              factoryId,
              factory.name ?? '',
              inputIndex,
              input.resource,
            ].join(FIELD_SEP),
          );
        }
      });
    }
    return parts.join(SIG_SEP);
  });

  // ─── Resolution pass: parse the signature and validate each row
  //     against the current node set. Runs only when the signature
  //     string actually changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: savegameOverrides is consumed indirectly via getWorldResourceNodes' getState() lookup; the dep is required to invalidate after import.
  return useMemo(() => {
    if (!signature) return {};

    // Lookup table for "is this node id still on the map, and what's
    // its current resource?". Built once per recompute.
    const nodes = getWorldResourceNodes(gameId);
    const validResourceById = new Map<string, string>();
    for (const n of nodes) validResourceById.set(n.id, n.resource);

    const result: Record<string, NodeAssignmentRef[]> = {};
    for (const row of signature.split(SIG_SEP)) {
      const [nodeId, factoryId, factoryName, inputIndexStr, resource] =
        row.split(FIELD_SEP);

      // Drop orphan assignments (node no longer exists on the map).
      const nodeResource = validResourceById.get(nodeId);
      if (!nodeResource) continue;

      // Drop mismatches (input.resource changed after assignment).
      // This is the auto-heal path: no storage write, the visual just
      // disappears until the user re-aligns the input.
      if (nodeResource !== resource) continue;

      const ref: NodeAssignmentRef = {
        factoryId,
        factoryName: factoryName === '' ? null : factoryName,
        inputIndex: Number(inputIndexStr),
        resource,
      };

      // Multiple inputs/factories CAN share the same node — keep them
      // as an array so the popup can list all of them.
      const arr = result[nodeId] ?? [];
      arr.push(ref);
      result[nodeId] = arr;
    }
    return result;
  }, [signature, gameId, savegameOverrides]);
};

/**
 * Returns the resolved nodes (filtered to the ones currently known on
 * the map and matching the input's resource) assigned to a specific
 * input. Used by the input row to render the "N nodes" pill with the
 * purity tooltip.
 *
 * Same signature/resolution trick as `useNodeAssignments`, scoped to a
 * single input so the consumer doesn't pay the whole-game scan cost.
 */
export const useFactoryInputAssignedNodes = (
  factoryId: string | null | undefined,
  inputIndex: number | null | undefined,
): WorldResourceNode[] => {
  const gameId = useStore(state => state.games.selected);
  const savegameOverrides = useStore(state =>
    gameId ? state.games.games[gameId]?.savegameNodeOverrides : undefined,
  );

  // Encode `[resource, ...nodeIds]` as a single string. Empty when
  // there's nothing to render — the consumer can short-circuit.
  const signature = useStore(state => {
    if (!factoryId || inputIndex == null) return '';
    const input = state.factories.factories[factoryId]?.inputs?.[inputIndex];
    if (!input || input.factoryId !== WORLD_SOURCE_ID) return '';
    if (!input.nodeIds || input.nodeIds.length === 0) return '';
    return [input.resource ?? '', ...input.nodeIds].join(FIELD_SEP);
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: savegameOverrides triggers re-resolution after savegame import.
  return useMemo(() => {
    if (!signature) return [];

    const [resource, ...ids] = signature.split(FIELD_SEP);
    if (!resource) return [];

    // Build an id→node lookup once, then resolve each assigned id.
    const nodes = getWorldResourceNodes(gameId);
    const byId = new Map(nodes.map(n => [n.id, n] as const));

    const out: WorldResourceNode[] = [];
    for (const id of ids) {
      const node = byId.get(id);
      if (!node) continue; // orphan — node removed by a savegame import
      if (node.resource !== resource) continue; // resource swap auto-heal
      out.push(node);
    }
    return out;
  }, [signature, gameId, savegameOverrides]);
};
