import { useParams } from 'react-router-dom';
import { useShallowStore, useStore } from '../../core/zustand';
import { AllFactoryRecipes } from '../../recipes/FactoryRecipe';

export const usePathSolverInstance = () => {
  const id = useParams<{ id: string }>().id;
  return useStore(state => state.solvers.instances[id ?? '']);
};

export const useSolverAllowedRecipes = (id: string | null | undefined) => {
  return useShallowStore(state =>
    id
      ? (state.solvers.instances[id]?.request.allowedRecipes ??
        AllFactoryRecipes.map(r => r.id))
      : null,
  );
};
