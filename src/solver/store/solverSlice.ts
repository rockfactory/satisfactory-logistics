import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import {
  getAllAlternateRecipeIds,
  getAllDefaultRecipesIds,
} from '@/recipes/graph/getAllDefaultRecipes';
import { uniq, without } from 'lodash';
import { createSlice } from '../../core/zustand-helpers/slices';
import { SolverInstance, type SolverNodeState } from './Solver';

export interface SolversSlice {
  /**
   * Used only for unlinked solvers
   */
  current: string | null;
  instances: Record<string, SolverInstance>;
}

export const solversSlice = createSlice({
  name: 'solvers',
  value: {
    current: null,
    instances: {},
  } as SolversSlice,
  actions: {
    setCurrentSolver: (id: string | null) => state => {
      state.current = id;
    },
    updateSolver:
      (id: string, fn: (solver: SolverInstance) => void) => state => {
        fn(state.instances[id]);
      },
    updateSolverNode:
      (id: string, nodeId: string, fn: (node: SolverNodeState) => void) =>
      state => {
        if (!state.instances[id].nodes) {
          state.instances[id].nodes = {};
        }
        if (!state.instances[id].nodes[nodeId]) {
          state.instances[id].nodes[nodeId] = {};
        }
        fn(state.instances[id].nodes[nodeId]);
      },
    createSolver:
      (
        id: string,
        options?: {
          allowedRecipes?: string[];
        },
      ) =>
      state => {
        state.instances[id] = {
          id,
          isFactory: false,
          isOwner: true,
          request: {
            allowedRecipes:
              options?.allowedRecipes ?? getAllDefaultRecipesIds(),
            objective: 'minimize_resources',
          },
        };
      },
    removeSolver: (id: string) => state => {
      delete state.instances[id];
    },
    toggleRecipe:
      (id: string, options: { recipeId: string; use?: boolean }) => state => {
        const { recipeId, use } = options;
        const instance = state.instances[id];
        if (!instance.request.allowedRecipes) {
          instance.request.allowedRecipes = getAllDefaultRecipesIds();
        }

        const allowedRecipes = instance.request.allowedRecipes;
        const isAllowed = use ?? !allowedRecipes?.includes(recipeId);
        const index = allowedRecipes?.indexOf(recipeId);

        if (isAllowed && index === -1) {
          allowedRecipes?.push(recipeId);
        } else if (!isAllowed && index >= 0) {
          allowedRecipes?.splice(index, 1);
        }
      },
    setAllowedRecipes:
      (id: string, fn: (recipes: string[]) => string[]) => state => {
        state.instances[id].request.allowedRecipes = fn(
          state.instances[id].request.allowedRecipes ?? [],
        );
      },

    toggleAllRecipes: (id: string, use: boolean) => state => {
      const instance = state.instances[id];
      if (use) {
        instance.request.allowedRecipes = AllFactoryRecipes.map(r => r.id);
      } else {
        instance.request.allowedRecipes = [];
      }
    },
    toggleDefaultRecipes: (id: string, use: boolean) => state => {
      const instance = state.instances[id];
      if (!instance.request.allowedRecipes) {
        instance.request.allowedRecipes = [];
      }
      if (use) {
        instance.request.allowedRecipes = uniq(
          instance.request.allowedRecipes.concat(getAllDefaultRecipesIds()),
        );
      } else {
        instance.request.allowedRecipes = without(
          instance.request.allowedRecipes,
          ...getAllDefaultRecipesIds(),
        );
      }
    },
    toggleAlternateRecipes: (id: string, use: boolean) => state => {
      const instance = state.instances[id];
      if (!instance.request.allowedRecipes) {
        instance.request.allowedRecipes = [];
      }
      if (use) {
        instance.request.allowedRecipes = uniq(
          instance.request.allowedRecipes.concat(getAllAlternateRecipeIds()),
        );
      } else {
        instance.request.allowedRecipes = without(
          instance.request.allowedRecipes,
          ...getAllAlternateRecipeIds(),
        );
      }
    },
    saveSolverSharedId: (id: string, sharedId: string) => state => {
      state.instances[id].sharedId = sharedId;
    },
  },
});
