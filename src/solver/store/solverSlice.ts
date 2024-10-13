import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import { createSlice } from '../../core/zustand-helpers/slices';
import { SolverInstance } from './Solver';

export interface SolversSlice {
  current: string | null;
  instances: Record<string, SolverInstance>;
}

export const solversSlice = createSlice({
  name: 'solvers',
  value: {
    // TODO Remove current
    current: null,
    instances: {},
  } as SolversSlice,
  actions: {
    updateSolver:
      (id: string, fn: (solver: SolverInstance) => void) => state => {
        fn(state.instances[id]);
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
        console.log(
          'Creating solver',
          id,
          'recipes=',
          state.instances[id].request.allowedRecipes,
        );
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
    saveSolverSharedId: (id: string, sharedId: string) => state => {
      state.instances[id].sharedId = sharedId;
    },
    loadSharedSolver:
      (
        instance: SolverInstance,
        data: {
          isOwner: boolean;
          localId: string;
        },
      ) =>
      state => {
        const { isOwner, localId } = data;
        state.instances[localId] = instance;
        if (!isOwner) {
          state.instances[localId].sharedId = undefined; // We need to unlink the shared instance
          state.instances[localId].isOwner = false;
          state.instances[localId].isFactory = false;
          state.instances[localId].remoteSharedId = instance.sharedId;
        }
      },
  },
});
