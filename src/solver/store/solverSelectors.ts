import { useParams } from 'react-router-dom';
import { useShallowStore, useStore, type RootState } from '@/core/zustand';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { SolverInstance } from '@/solver/store/Solver';
import { useFactoryContext } from '@/FactoryContext';

export const usePathSolverInstance = (
  id: string,
): SolverInstance | undefined => {
  return useStore(state => state.solvers.instances[id]);
};

export const usePathSolverRequest = () => {
  const id = useFactoryContext();
  return useStore(state => state.solvers.instances[id ?? '']?.request);
};

export const useSolverAllowedRecipes = (id: string | null | undefined) => {
  return useShallowStore(state =>
    id
      ? (state.solvers.instances[id]?.request.allowedRecipes ??
        AllFactoryRecipes.map(r => r.id))
      : null,
  );
};

export const useSolverResourcesAmount = (id: string | null | undefined) => {
  return useShallowStore(state =>
    id ? state.solvers.instances[id]?.request.resourcesAmount : null,
  );
};

export const getSolverGame = (state: RootState, id: string) => {
  return Object.values(state.games.games).find(game =>
    game.factoriesIds.includes(id),
  );
};

export const useSolverGameId = (id: string | null | undefined) => {
  return useStore(state => {
    const game = getSolverGame(state, id ?? '');
    return game?.id ?? null;
  });
};

export const useCurrentSolverId = () => {
  return useStore(state => state.solvers.current);
};

export const usePathSolverLayout = (id: string) => {
  return useStore(state => state.solvers.instances[id]?.layout);
};
