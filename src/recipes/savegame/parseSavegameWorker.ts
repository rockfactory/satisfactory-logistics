import { loglev } from '@/core/logger/log';
import {
  Parser,
  type ObjectArrayProperty,
  type SatisfactorySave,
} from '@etothepii/satisfactory-file-parser';
import type {
  IParseSavegameRequest,
  IParseSavegameResponse,
} from './ParseSavegameMessages';

const logger = loglev.getLogger('parse-savegame');

async function parseSavegame(file: File) {
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

    const { availableRecipes } = inspectSavegame(json);

    postMessage({
      type: 'parsed',
      save: {
        availableRecipes,
      },
    } as IParseSavegameResponse);
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
  const objects = save.levels.flatMap(level => level.objects);

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

  logger.log('Available recipes:', availableRecipesIds);
  return {
    availableRecipes: [...availableRecipesIds],
  };
}

addEventListener('message', (event: MessageEvent<IParseSavegameRequest>) => {
  const { data } = event;
  if (data.type === 'parse') {
    parseSavegame(data.file);
  }
});
