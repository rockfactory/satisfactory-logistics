import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import { captureException } from '@sentry/react';
import { v4 } from 'uuid';
import type { RootState } from '@/core/zustand';

export function migratePersistedStoreFromRedux() {
  const previous = localStorage.getItem('persist:root');
  if (!previous) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(previous);
    for (const key in parsed) {
      parsed[key] = JSON.parse(parsed[key]);
    }
  } catch (e) {
    console.error('Failed to parse previous store:', e);
    captureException(e);
    return null;
  }

  console.log('Migrated store from Redux !:', parsed);
  const migratedGameId = v4();
  try {
    const nextState: Partial<RootState> = {
      auth: {
        session: parsed.auth.session,
        sync: {
          isSynced: false,
          latestChangeDetectedAt: 0,
          syncedAt: 0,
          versionId: null,
          isSyncing: false,
        },
      },
      factories: {
        factories: Object.fromEntries(
          parsed.factories.present.factories?.map((f: any) => [f.id, f]) ?? [],
        ),
      },
      factoryView: parsed.factories.present.filter ?? {},
      games: {
        selected: migratedGameId,
        games: {
          [migratedGameId]: {
            id: migratedGameId,
            allowedRecipes: getAllDefaultRecipesIds(),
            factoriesIds:
              parsed.factories.present.factories?.map((f: any) => f.id) ?? [],
            name: 'My Savegame',
            settings: parsed.factories.present.settings,
          },
        },
      },
      solvers: {
        current: null,
        instances: parsed.solver?.present?.instances ?? {},
      },
    };

    console.log('Migrated state is:', nextState);
    return nextState;
  } catch (e) {
    console.error('Failed to migrate store:', e);
    captureException(e);
    return null;
  }
  //  localStorage.removeItem('persist:root');
}
