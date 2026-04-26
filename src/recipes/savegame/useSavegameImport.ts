import { notifications } from '@mantine/notifications';
import { useCallback, useState } from 'react';
import { useStore } from '@/core/zustand';
import type { ApplySavegameToGameOptions } from '@/games/gamesSlice';
import type { ParsedSatisfactorySave } from './ParseSavegameMessages';
import { startSavegameParsing } from './startSavegameParsing';

/**
 * Progress snapshot surfaced while the web worker chews through a
 * `.sav` file. `value` is a 0-1 fraction; `message` is the
 * parser's occasional status string (e.g. "Parsing levels...").
 */
export interface SavegameImportProgress {
  value: number;
  message?: string;
}

/**
 * Result of a successful `importAndApplyToGame` call. Includes the
 * parsed save so callers (e.g. the recipes drawer) can do additional
 * non-game-state work on top, like updating the active solver
 * instance's allowed-recipe list.
 */
export interface SavegameImportApplied {
  save: ParsedSatisfactorySave;
  applied: ApplySavegameToGameOptions;
  recipeCount: number;
  usedNodeCount: number;
  /** Sum of buildings + spline polylines extracted, when applicable. */
  infrastructureCount: number;
}

export interface UseSavegameImportResult {
  importing: boolean;
  progress: SavegameImportProgress;
  /**
   * Low-level: kicks off parsing for the given `.sav` file and
   * resolves with the parsed save. Most callers should prefer
   * {@link UseSavegameImportResult.importAndApplyToGame} so import
   * semantics stay consistent across surfaces.
   */
  importFile: (
    file: File,
    options?: { extractInfrastructure?: boolean },
  ) => Promise<ParsedSatisfactorySave>;
  /**
   * High-level: parses the file, applies the requested slices of
   * derivable state to the game in a single store patch, and surfaces
   * a unified success / failure notification. The promise resolves
   * with the parsed save plus a summary of what was applied so
   * callers can chain additional updates (e.g. solver-instance
   * recipe lists) on the same flow.
   *
   * If `gameId` is null/undefined a "no game selected" notification
   * is shown and the promise resolves to `null` without parsing.
   */
  importAndApplyToGame: (
    file: File,
    gameId: string | null | undefined,
    apply: ApplySavegameToGameOptions,
  ) => Promise<SavegameImportApplied | null>;
  /**
   * Resets progress / importing back to idle. Useful when a caller
   * unmounts a modal after success so reopening it starts fresh.
   */
  reset: () => void;
}

const IDLE_PROGRESS: SavegameImportProgress = { value: 0, message: undefined };

/**
 * Wrapper around {@link startSavegameParsing} that tracks `importing`
 * + `progress` state for a single active import and centralizes the
 * "apply this save to a game" flow. Shared between the recipes drawer,
 * map filter panel, and map drop zone so all three surfaces produce
 * identical store updates and notifications for the same file.
 */
export function useSavegameImport(): UseSavegameImportResult {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] =
    useState<SavegameImportProgress>(IDLE_PROGRESS);

  const importFile = useCallback(
    (
      file: File,
      options: { extractInfrastructure?: boolean } = {},
    ): Promise<ParsedSatisfactorySave> => {
      setImporting(true);
      setProgress(IDLE_PROGRESS);
      return startSavegameParsing(
        file,
        (value, message) => {
          setProgress({ value, message });
        },
        { extractInfrastructure: options.extractInfrastructure },
      )
        .then(save => {
          setImporting(false);
          return save;
        })
        .catch(err => {
          setImporting(false);
          throw err;
        });
    },
    [],
  );

  const importAndApplyToGame = useCallback(
    async (
      file: File,
      gameId: string | null | undefined,
      apply: ApplySavegameToGameOptions,
    ): Promise<SavegameImportApplied | null> => {
      if (!gameId) {
        notifications.show({
          title: 'No game selected',
          message: 'Create or select a game before importing a save.',
          color: 'yellow',
        });
        return null;
      }

      try {
        const save = await importFile(file, {
          extractInfrastructure: apply.infrastructure,
        });
        useStore.getState().updateGameFromSavegame(gameId, save, apply);

        const recipeCount = apply.defaultRecipes
          ? save.availableRecipes.length
          : 0;
        const usedNodeCount = apply.usedNodes ? save.usedNodeIds.length : 0;

        let infrastructureCount = 0;
        if (apply.infrastructure && save.infrastructure) {
          infrastructureCount =
            save.infrastructure.buildings.count +
            save.infrastructure.splines.reduce((s, b) => s + b.count, 0);
          useStore
            .getState()
            .setInfrastructure(gameId, save.infrastructure);
        }

        notifications.show({
          title: 'Savegame imported',
          message: buildSummaryMessage(
            apply,
            recipeCount,
            usedNodeCount,
            infrastructureCount,
          ),
          color: 'green',
        });

        return {
          save,
          applied: apply,
          recipeCount,
          usedNodeCount,
          infrastructureCount,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown parser error';
        console.error('Error while parsing savegame:', message);
        notifications.show({
          title: 'Error while parsing savegame',
          message,
          color: 'red',
        });
        throw err;
      }
    },
    [importFile],
  );

  const reset = useCallback(() => {
    setImporting(false);
    setProgress(IDLE_PROGRESS);
  }, []);

  return { importing, progress, importFile, importAndApplyToGame, reset };
}

function buildSummaryMessage(
  apply: ApplySavegameToGameOptions,
  recipeCount: number,
  usedNodeCount: number,
  infrastructureCount: number,
): string {
  const parts: string[] = [];
  if (apply.defaultRecipes) {
    parts.push(
      `${recipeCount} recipe${recipeCount === 1 ? '' : 's'} as game default`,
    );
  }
  if (apply.usedNodes) {
    if (usedNodeCount === 0) {
      parts.push('cleared used-node marks (no miners in save)');
    } else {
      parts.push(`${usedNodeCount} used node${usedNodeCount === 1 ? '' : 's'}`);
    }
  }
  if (apply.infrastructure) {
    parts.push(
      `${infrastructureCount} built structure${infrastructureCount === 1 ? '' : 's'}`,
    );
  }
  if (parts.length === 0) {
    return 'Save parsed successfully (no game state updated).';
  }
  return `Updated: ${parts.join(', ')}.`;
}
