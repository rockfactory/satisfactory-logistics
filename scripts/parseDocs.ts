import fs from 'node:fs';
import { convertDocsImagesToPublic } from './parsers/images/convertDocsImagesToPublic';
import { parseBuildings } from './parsers/parseBuildings';
import { parseItems } from './parsers/parseItems';
import { parseRecipes } from './parsers/parseRecipes';
import { parseSchematics } from './parsers/parseSchematic';

const args = process.argv.slice(2);

const ImageRegex = /(?:UI|QuantumEnergy)\/(?:IconDesc_)?(.*)_256\./;

const docsJson = JSON.parse(fs.readFileSync('./data/docs-en.json', 'utf8'));

async function parseDocs() {
  // Items
  parseItems(docsJson);

  // Buildings
  parseBuildings(docsJson);

  // Recipes
  parseRecipes(docsJson);

  // Schematics
  parseSchematics(docsJson);

  // Images
  if (args.some(a => a === '--with-images')) {
    console.log('Parsing images...');
    await convertDocsImagesToPublic();
  }
}

parseDocs().catch(error => {
  console.error('Error parsing docs:', error);
  process.exit(1);
});
