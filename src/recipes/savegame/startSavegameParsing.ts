import type {
  IParseSavegameRequest,
  IParseSavegameResponse,
  ParsedSatisfactorySave,
} from './ParseSavegameMessages';

export function startSavegameParsing(
  file: File,
  onProgress?: (progress: number, message?: string) => void,
): Promise<ParsedSatisfactorySave> {
  const worker = new Worker(
    new URL('./parseSavegameWorker.ts', import.meta.url),
    { type: 'module' },
  );
  worker.postMessage({ type: 'parse', file } as IParseSavegameRequest);

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
