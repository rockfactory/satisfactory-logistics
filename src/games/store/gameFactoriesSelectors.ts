import { useShallowStore } from '@/core/zustand';

export function useGameFactories(gameId?: string | null | undefined) {
  return useShallowStore(
    state =>
      state.games.games[gameId ?? state.games.selected ?? '']?.factoriesIds.map(
        factoryId => state.factories.factories[factoryId],
      ) ?? [],
  );
}
