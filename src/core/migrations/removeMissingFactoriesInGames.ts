import type { RootState } from '@/core/zustand';
import { produce } from 'immer';

export function removeMissingFactoriesInGames(state) {
  // Fix for missing factories in games
  return produce(state as RootState, draft => {
    for (const gameId in draft.games.games) {
      const game = draft.games.games[gameId];
      if (!game.factoriesIds) {
        game.factoriesIds = [];
      }
      game.factoriesIds = game.factoriesIds.filter(factoryId => {
        return draft.factories.factories[factoryId] != null;
      });
    }
  });
}
