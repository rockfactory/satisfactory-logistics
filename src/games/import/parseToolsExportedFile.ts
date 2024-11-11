// We need to use _exactly_ these libs since they are the ones used in the original code.
import type { Factory } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import type { SolverInstance } from '@/solver/store/Solver';
import * as base64 from 'base-64';
import dayjs from 'dayjs';
import without from 'lodash/without';
import pako from 'pako';
import { v4 } from 'uuid';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';
import type {
  ToolsSerializedData,
  ToolsSerializedTab,
} from './ToolsSerializedData';

export async function parseToolsExportedFile(file: File) {
  const raw = await readFile(file);
  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && line.charAt(0) !== '#')
    .join();

  const parsed = JSON.parse(
    pako.inflate(stringToBuffer(base64.decode(lines.substring(1))), {
      to: 'string',
    }),
  );

  return parsed as ToolsSerializedData;
}

function generateName(tab: ToolsSerializedTab) {
  if (tab.metadata?.name) {
    return tab.metadata.name;
  }

  const production = tab.request?.production ?? [];
  if (production.length === 0) {
    return undefined;
  }

  return production
    .map(p => AllFactoryItemsMap[p.item ?? '']?.displayName)
    .join(', ');
}

export function convertToSerializedGame(
  parsed: ToolsSerializedData,
): SerializedGame {
  const gameId = v4();

  if (parsed.type !== 'tabs') {
    throw new Error(
      'Invalid file type. You need to export tabs from Satisfactory Tools',
    );
  }

  const factories: Factory[] = [];
  const solvers: SolverInstance[] = [];

  for (const tab of parsed.tabs ?? []) {
    const factory: Factory = {
      id: v4(),
      name: generateName(tab),
      inputs:
        tab.request?.input?.map(input => ({
          resource: input.item,
          amount: input.amount ?? 0,
        })) ?? [],
      outputs:
        tab.request?.production?.map(output => ({
          resource: output.item ?? '',
          amount: output.amount ?? 0,
        })) ?? [],
    };

    factories.push(factory);

    const solver: SolverInstance = {
      id: factory.id,
      isFactory: true,
      isOwner: true,
      request: {
        allowedRecipes: [
          ...without(
            getAllDefaultRecipesIds(),
            ...(tab.request?.blockedRecipes ?? []),
          ),
          ...(tab.request?.allowedAlternateRecipes ?? []),
        ],
        blockedBuildings:
          tab.request?.blockedMachines?.map(name =>
            name.replace('Desc_', 'Build_'),
          ) ?? [],
        blockedResources: tab.request?.blockedResources ?? [],
        objective: 'minimize_resources',
      },
      nodes: {},
    };

    solvers.push(solver);
  }

  const game: SerializedGame = {
    game: {
      id: gameId,
      name: `Imported at ${dayjs().format('YYYY-MM-DD')}`,
      factoriesIds: factories.map(factory => factory.id),
      settings: {
        noHighlight100PercentUsage: false,
        highlight100PercentColor: '#339af0',
      },
    },
    factories,
    solvers,
  };

  return game;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function stringToBuffer(str: string) {
  const len = str.length;
  const buffer = new ArrayBuffer(len);
  const bufferView = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bufferView[i] = str.charCodeAt(i);
  }
  return buffer;
}
