import { ReadableStreamParser } from '@etothepii/satisfactory-file-parser';
import { JSONParser } from '@streamparser/json';
import { loglev } from '@/core/logger/log';
import {
  createInfrastructureAccumulator,
  finalizeInfrastructure,
  ingestEntity,
} from './infrastructure/extractInfrastructure';
import {
  createInspectAccumulator,
  finalizeInspect,
  inspectObject,
} from './inspectSavegame';
import {
  collectInfrastructureTransferables,
  type IParseSavegameRequest,
  type IParseSavegameResponse,
  type ParsedSatisfactorySave,
} from './ParseSavegameMessages';
import { installSatisfactoryParserPatches } from './parserPatches';

installSatisfactoryParserPatches();

const logger = loglev.getLogger('parse-savegame');

// `postMessage` inside a Worker module accepts a `transfer` array, but
// the default DOM lib in tsconfig types it as the window-scoped variant
// (which expects a `targetOrigin` string). Locally re-typed to avoid
// pulling the WebWorker lib into the whole project.
const workerPostMessage = postMessage as (
  message: IParseSavegameResponse,
  transfer?: ArrayBuffer[],
) => void;

/**
 * Streaming-friendly parse: pipes the parser library's
 * `ReadableStream<string>` of JSON through a SAX-style
 * `JSONParser` TransformStream that emits one fully-formed object
 * per `levels.*.objects.*` match. Each object is fed into the
 * inspect / infrastructure accumulators and then dropped, keeping
 * the worker heap bounded (the parser's WHATWG backpressure pauses
 * production once the consumer falls behind). This replaces an
 * earlier eager `Parser.ParseSave` path that materialised the
 * entire save graph in memory and OOMed on endgame saves.
 */
async function parseSavegame(
  file: File,
  options: { extractInfrastructure?: boolean },
) {
  try {
    const buffer = await file.arrayBuffer();
    const { stream, startStreaming } =
      ReadableStreamParser.CreateReadableStreamFromSaveToJson('Save', buffer, {
        onProgress: (progress: number, message?: string) => {
          postMessage({
            type: 'progress',
            progress,
            message,
          } as IParseSavegameResponse);
        },
      });

    const wantInfrastructure = options.extractInfrastructure === true;
    const inspectAcc = createInspectAccumulator();
    const infraAcc = wantInfrastructure
      ? createInfrastructureAccumulator()
      : null;

    // Consume the parser library's `ReadableStream<string>` directly and
    // feed each chunk into a `JSONParser` (the non-WHATWG variant). The
    // WHATWG `TransformStream` wrapper from `@streamparser/json-whatwg`
    // cannot be used here: its `cloneParsedElementInfo` does
    // `JSON.parse(JSON.stringify(parent))` on every emit, and with
    // `keepStack: false` the parent array grows monotonically (deleted
    // entries leave holes). The clone cost is O(N) per emit, total O(N²)
    // — effectively hangs on endgame saves with hundreds of thousands
    // of objects. Driving the parser via the callback path skips the
    // clone entirely.
    const jsonParser = new JSONParser({
      paths: ['$.levels.*.objects.*'],
      keepStack: false,
    });
    jsonParser.onValue = info => {
      const obj = info.value;
      inspectObject(inspectAcc, obj);
      if (infraAcc) ingestEntity(infraAcc, obj);
    };

    const reader = (stream as ReadableStream<string>).getReader();

    const streamingDone = startStreaming();
    streamingDone.catch(err => {
      // If the parser library throws, surface the error through the
      // reader as well so the await loop below exits.
      reader.cancel(err).catch(() => {});
    });

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        jsonParser.write(value);
      }
    } finally {
      if (!jsonParser.isEnded) jsonParser.end();
    }
    // Wait for the parser library's startStreaming to settle. If it
    // rejected this re-throws here.
    await streamingDone;

    const { availableRecipes, usedNodeIds, players } =
      finalizeInspect(inspectAcc);
    const save: ParsedSatisfactorySave = {
      availableRecipes,
      usedNodeIds,
      players,
    };

    let transfer: ArrayBuffer[] = [];
    if (infraAcc) {
      postMessage({
        type: 'progress',
        progress: 0.99,
        message: 'Finalising infrastructure...',
      } as IParseSavegameResponse);
      save.infrastructure = finalizeInfrastructure(infraAcc);
      transfer = collectInfrastructureTransferables(save.infrastructure);
      logger.log(
        'Infrastructure extracted:',
        save.infrastructure.buildings.count,
        'buildings,',
        save.infrastructure.splines.reduce((sum, s) => sum + s.count, 0),
        'spline polylines',
      );
    }

    workerPostMessage(
      { type: 'parsed', save } as IParseSavegameResponse,
      transfer,
    );
  } catch (e) {
    logger.error(`Error while parsing`, e);
    postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : e,
    } as IParseSavegameResponse);
  }
}

addEventListener('message', (event: MessageEvent<IParseSavegameRequest>) => {
  const { data } = event;
  if (data.type === 'parse') {
    parseSavegame(data.file, {
      extractInfrastructure: data.extractInfrastructure ?? false,
    });
  }
});
