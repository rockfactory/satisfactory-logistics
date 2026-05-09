import { v4 } from 'uuid';
import { MANUAL_SOURCE_ID, WORLD_SOURCE_ID } from '@/factories/Factory';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';

export interface RemapSerializedGameIdsOptions {
  /** If set, the serialized game's id is rewritten to this value. */
  targetGameId?: string;
}

/**
 * Returns a copy of the serialized game with ids rewritten for a new slot.
 *
 * When `targetGameId` differs from the source game id, factory and solver ids
 * are regenerated (and cross-references updated) to avoid collisions with
 * factories that may still belong to the original game. When it matches (or
 * is omitted), ids are preserved so solver state and external bookmarks stay
 * intact.
 */
export function remapSerializedGameIds(
  serialized: SerializedGame,
  options: RemapSerializedGameIdsOptions = {},
): SerializedGame {
  const { targetGameId } = options;
  const shouldRemapFactoryIds =
    targetGameId !== undefined && targetGameId !== serialized.game.id;

  const factoryIdMap = new Map<string, string>();
  if (shouldRemapFactoryIds) {
    for (const factory of serialized.factories) {
      factoryIdMap.set(factory.id, v4());
    }
  }

  const mapFactoryId = (id: string | null | undefined) => {
    if (!id || id === WORLD_SOURCE_ID || id === MANUAL_SOURCE_ID) return id;
    return factoryIdMap.get(id) ?? id;
  };

  const factories = serialized.factories.map(factory => ({
    ...factory,
    id: mapFactoryId(factory.id) as string,
    inputs:
      factory.inputs?.map(input => ({
        ...input,
        factoryId: mapFactoryId(input.factoryId),
      })) ?? [],
  }));

  const solvers = serialized.solvers.map(solver => ({
    ...solver,
    id: mapFactoryId(solver.id) as string,
  }));

  const game = {
    ...serialized.game,
    id: targetGameId ?? serialized.game.id,
    factoriesIds: serialized.game.factoriesIds.map(
      id => mapFactoryId(id) as string,
    ),
    collapsedFactoriesIds: serialized.game.collapsedFactoriesIds?.map(
      id => mapFactoryId(id) as string,
    ),
  };

  return { game, factories, solvers };
}
