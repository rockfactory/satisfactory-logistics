import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import {
  isSerializedFactory,
  type SerializedFactory,
} from '@/games/store/gameFactoriesActions';

function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        resolve(JSON.parse(content));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

function describeRejection(parsed: unknown): string {
  if (
    parsed &&
    typeof parsed === 'object' &&
    'kind' in parsed &&
    (parsed as { kind: unknown }).kind === 'game'
  ) {
    return 'This is a game backup. Use Games > Import to load it.';
  }
  return 'File is not a valid factory backup.';
}

/**
 * Wraps `readText` with a clearer error message when the browser blocks
 * clipboard access.
 *
 * Note: we deliberately do NOT call `navigator.permissions.query` first.
 * On Chromium-family browsers (including Vivaldi) any `await` before
 * `clipboard.readText()` can break the user-gesture chain and either
 * silently fail or leave the call pending, depending on the browser's
 * site settings. Calling `readText()` directly from inside the click
 * handler keeps the gesture context valid and lets the browser show its
 * native permission prompt the first time.
 */
async function readClipboardText(): Promise<string> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
    throw new Error(
      'Clipboard reading is not supported in this browser. Try the file import instead.',
    );
  }

  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'SecurityError')
    ) {
      throw new Error(
        'Clipboard permission was denied. Allow clipboard access for this site in your browser, or use the file import.',
      );
    }
    throw error;
  }
}

type ImportSource = 'file' | 'clipboard';

const FAILURE_TITLE: Record<ImportSource, string> = {
  file: 'Failed to import factory',
  clipboard: 'Failed to paste factory',
};

const GENERIC_FAILURE_MESSAGE: Record<ImportSource, string> = {
  file: 'File is not a valid factory backup.',
  clipboard: 'Clipboard does not contain a factory.',
};

/**
 * Single source of truth for import error notifications. Both file and
 * clipboard paths funnel through here so the wording stays consistent and
 * errors get logged + surfaced even when the underlying API failed
 * silently (e.g. clipboard permissions blocked at the browser level).
 */
function notifyImportFailure(source: ImportSource, error: unknown) {
  console.error(`[importFactory:${source}]`, error);
  notifications.show({
    title: FAILURE_TITLE[source],
    message:
      error instanceof Error && error.message
        ? error.message
        : GENERIC_FAILURE_MESSAGE[source],
    color: 'red',
    autoClose: 6000,
  });
}

/**
 * Imports a single-factory payload (from a file or the clipboard) into the
 * currently-selected game and navigates to the new factory. The two
 * surfaces (toolbar dropdown, future detail-page actions) share these
 * helpers so validation and notification copy stay in lockstep.
 */
export function useImportFactory() {
  const navigate = useNavigate();

  const importFromPayload = useCallback(
    (payload: SerializedFactory) => {
      const newFactoryId = v4();
      useStore
        .getState()
        .importSerializedFactoryIntoCurrentGame(newFactoryId, payload);

      notifications.show({
        title: 'Factory imported',
        message: payload.factory.name
          ? `"${payload.factory.name}" was added to the current game.`
          : 'A new factory was added to the current game.',
        color: 'green',
      });
      navigate(`/factories/${newFactoryId}`);
    },
    [navigate],
  );

  const importFromFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const parsed = await readJsonFile(file);
        if (!isSerializedFactory(parsed)) {
          throw new Error(describeRejection(parsed));
        }
        importFromPayload(parsed);
      } catch (error) {
        notifyImportFailure('file', error);
      }
    },
    [importFromPayload],
  );

  const importFromClipboard = useCallback(async () => {
    try {
      const text = await readClipboardText();
      if (!text) {
        throw new Error('Clipboard is empty.');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Clipboard does not contain valid JSON.');
      }
      if (!isSerializedFactory(parsed)) {
        throw new Error(describeRejection(parsed));
      }
      importFromPayload(parsed);
    } catch (error) {
      notifyImportFailure('clipboard', error);
    }
  }, [importFromPayload]);

  return { importFromFile, importFromClipboard };
}
