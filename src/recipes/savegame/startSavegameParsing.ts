import type {
  IParseSavegameRequest,
  IParseSavegameResponse,
  ParsedSatisfactorySave,
} from './ParseSavegameMessages';

export interface StartSavegameParsingOptions {
  /**
   * When true, the worker also extracts every user-built buildable
   * (machines, belts, pipes, foundations, ...) and returns it in
   * `ParsedSatisfactorySave.infrastructure` for the map's
   * infrastructure layer. Off by default because it adds a parse pass
   * and a few MB of typed-array payload on large saves.
   */
  extractInfrastructure?: boolean;
}

export function startSavegameParsing(
  file: File,
  onProgress?: (progress: number, message?: string) => void,
  options: StartSavegameParsingOptions = {},
): Promise<ParsedSatisfactorySave> {
  const worker = new Worker(
    new URL('./parseSavegameWorker.ts', import.meta.url),
    { type: 'module' },
  );
  worker.postMessage({
    type: 'parse',
    file,
    extractInfrastructure: options.extractInfrastructure,
  } as IParseSavegameRequest);

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<IParseSavegameResponse>) => {
      const { data } = event;
      if (data.type === 'parsed') {
        //   console.log('Parsed:', data.json);
        resolve(data.save);
      } else if (data.type === 'progress') {
        console.log('Progress:', data.progress, data.message);
        onProgress?.(data.progress, data.message);
      } else if (data.type === 'error') {
        console.error('Error while parsing:', data.message);
        reject(data);
      }
    };
  });
}
