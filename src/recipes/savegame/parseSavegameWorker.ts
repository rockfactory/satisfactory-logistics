import {
  type ObjectArrayProperty,
  type ObjectProperty,
  Parser,
  type SatisfactorySave,
} from '@etothepii/satisfactory-file-parser';
import { loglev } from '@/core/logger/log';
import { extractInfrastructure } from './extractInfrastructure';
import {
  collectInfrastructureTransferables,
  type IParseSavegameRequest,
  type IParseSavegameResponse,
  type ParsedSatisfactorySave,
} from './ParseSavegameMessages';

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
 * Full Unreal typePath strings for every placeable extractor we
 * translate into a "used node" mark. Checked against
 * `SaveEntity.typePath`. Water pumps are intentionally excluded:
 * their `mExtractableResource` points at `FGWaterVolume_*` actors
 * rather than a `BP_ResourceNode_*`, so the id does not line up with
 * anything in our `WorldResourceNodes.json` dataset.
 *
 * Miner tiers are matched by regex at the last segment of the
 * typePath (see {@link MINER_LAST_SEGMENT_RE}), so a hypothetical
 * future Mk4 will be picked up without a code change. The
 * non-miner extractors are listed explicitly since their naming is
 * one-offs.
 */
const EXPLICIT_EXTRACTOR_TYPE_PATHS = new Set<string>([
  '/Game/FactoryGame/Buildable/Factory/OilPump/Build_OilPump.Build_OilPump_C',
  '/Game/FactoryGame/Buildable/Factory/FrackingExtractor/Build_FrackingExtractor.Build_FrackingExtractor_C',
]);

/** Matches `Build_MinerMk1_C`, `Build_MinerMk2_C`, ... on the last segment. */
const MINER_LAST_SEGMENT_RE = /^Build_MinerMk\d+_C$/;

function isExtractorTypePath(typePath: string): boolean {
  if (EXPLICIT_EXTRACTOR_TYPE_PATHS.has(typePath)) return true;
  const lastSegment = typePath.split('.').pop();
  return lastSegment != null && MINER_LAST_SEGMENT_RE.test(lastSegment);
}

async function parseSavegame(
  file: File,
  options: { extractInfrastructure?: boolean },
) {
  try {
    const json = Parser.ParseSave('Save', await file.arrayBuffer(), {
      onProgressCallback: (progress: number, msg?: string) => {
        postMessage({
          type: 'progress',
          progress,
          message: msg,
        } as IParseSavegameResponse);
      },
    });

    const { availableRecipes, usedNodeIds } = inspectSavegame(json);

    const save: ParsedSatisfactorySave = {
      availableRecipes,
      usedNodeIds,
    };

    let transfer: ArrayBuffer[] = [];
    if (options.extractInfrastructure) {
      postMessage({
        type: 'progress',
        progress: 0.99,
        message: 'Extracting built infrastructure...',
      } as IParseSavegameResponse);
      save.infrastructure = extractInfrastructure(json);
      transfer = collectInfrastructureTransferables(save.infrastructure);
      logger.log(
        'Infrastructure extracted:',
        save.infrastructure.buildings.count,
        'buildings,',
        save.infrastructure.splines.reduce((sum, s) => sum + s.count, 0),
        'spline polylines',
      );
    }

    const response: IParseSavegameResponse = { type: 'parsed', save };
    workerPostMessage(response, transfer);
  } catch (e) {
    logger.error(`Error while parsing`, e);
    postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : e,
    } as IParseSavegameResponse);
  }
}

function inspectSavegame(save: SatisfactorySave) {
  // All objects in the savegame
  const objects = Object.values(save.levels).flatMap(level => level.objects);

  // Search for the recipe manager
  const recipeManager = objects.find(
    obj => obj.typePath === '/Script/FactoryGame.FGRecipeManager',
  );

  // Get the available recipes
  const availableRecipesProperty = recipeManager?.properties
    ?.mAvailableRecipes as ObjectArrayProperty;
  const availableRecipesIds = new Set(
    availableRecipesProperty?.values.map(
      value => value?.pathName.split('.')[1],
    ),
  );

  // Collect resource-node ids that have an extractor sitting on them.
  // The `mExtractableResource` object property holds a reference like
  // `Persistent_Level:PersistentLevel.BP_ResourceNode452`; the trailing
  // segment after the final `.` matches the `id` field we store in
  // `WorldResourceNodes.json`.
  const usedNodeIds = new Set<string>();
  for (const object of objects) {
    if (typeof object.typePath !== 'string') continue;
    if (!isExtractorTypePath(object.typePath)) continue;
    const ref = object.properties?.mExtractableResource as
      | ObjectProperty
      | undefined;
    const pathName = ref?.value?.pathName;
    if (!pathName) continue;
    const nodeId = pathName.split('.').pop();
    if (!nodeId) continue;
    usedNodeIds.add(nodeId);
  }

  logger.log('Available recipes:', availableRecipesIds);
  logger.log('Used node ids:', usedNodeIds);
  return {
    availableRecipes: [...availableRecipesIds],
    usedNodeIds: [...usedNodeIds],
  };
}

addEventListener('message', (event: MessageEvent<IParseSavegameRequest>) => {
  const { data } = event;
  if (data.type === 'parse') {
    parseSavegame(data.file, {
      extractInfrastructure: data.extractInfrastructure ?? false,
    });
  }
});
