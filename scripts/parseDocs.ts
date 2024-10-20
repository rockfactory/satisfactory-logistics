import fs from 'node:fs';
import { parseBuildings } from './parsers/parseBuildings';
import { parseItems } from './parsers/parseItems';
import { parseRecipes } from './parsers/parseRecipes';
import { parseSchematics } from './parsers/parseSchematic';

const ImageRegex = /(?:UI|QuantumEnergy)\/(?:IconDesc_)?(.*)_256\./;

const docsJson = JSON.parse(fs.readFileSync('./data/docs-en.json', 'utf8'));

function parseDocs() {
  // Items
  parseItems(docsJson);

  // Buildings
  parseBuildings(docsJson);

  // Recipes
  parseRecipes(docsJson);

  // Schematics
  parseSchematics(docsJson);
}

parseDocs();
