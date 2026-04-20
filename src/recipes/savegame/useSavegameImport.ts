import { useCallback, useState } from 'react';
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

export interface UseSavegameImportResult {
  importing: boolean;
  progress: SavegameImportProgress;
  /**
   * Kicks off parsing for the given `.sav` file. Resolves with the
   * parsed save payload so the caller can do whatever it wants with
   * it (mark recipes available, mark used nodes, etc). Rejects on
   * parser error after surfacing the error via whatever mechanism
   * the caller wires (the hook itself doesn't show notifications so
   * map-side and modal-side UIs can tailor their own messaging).
   */
  importFile: (file: File) => Promise<ParsedSatisfactorySave>;
  /**
   * Resets progress / importing back to idle. Useful when a caller
   * unmounts a modal after success so reopening it starts fresh.
   */
  reset: () => void;
}

const IDLE_PROGRESS: SavegameImportProgress = { value: 0, message: undefined };

/**
 * Thin wrapper around {@link startSavegameParsing} that tracks
 * `importing` + `progress` state for a single active import. Shared
 * between `ImportSavegameRecipesModal` and the map filter panel's
 * "Import from save" button so both surfaces behave identically and
 * can reuse the same progress UI.
 *
 * The hook is intentionally concern-free beyond state tracking:
 * callers decide what to do with the resolved save (mark recipes
 * available, mark used nodes, ...) and how to surface success or
 * failure (notifications, modal close, ...).
 */
export function useSavegameImport(): UseSavegameImportResult {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] =
    useState<SavegameImportProgress>(IDLE_PROGRESS);

  const importFile = useCallback(
    (file: File): Promise<ParsedSatisfactorySave> => {
      setImporting(true);
      setProgress(IDLE_PROGRESS);
      return startSavegameParsing(file, (value, message) => {
        setProgress({ value, message });
      })
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

  const reset = useCallback(() => {
    setImporting(false);
    setProgress(IDLE_PROGRESS);
  }, []);

  return { importing, progress, importFile, reset };
}
