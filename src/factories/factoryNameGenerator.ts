const ADJECTIVES = [
  'Reckless',
  'Bold',
  'Curious',
  'Brave',
  'Eager',
  'Shiny',
  'Sturdy',
  'Molten',
  'Swift',
  'Heavy',
  'Mighty',
  'Rusty',
  'Gilded',
  'Electric',
  'Radiant',
  'Stormy',
  'Frozen',
  'Crimson',
  'Verdant',
  'Nuclear',
  'Pulsing',
  'Turbo',
  'Automated',
  'Encased',
  'Pioneer',
  'Industrious',
  'Overclocked',
  'Tactical',
  'Silent',
  'Whirring',
  'Humming',
  'Stoic',
  'Clever',
  'Nimble',
  'Glittering',
  'Ficsit',
  'Massive',
  'Modular',
  'Streamlined',
  'Colossal',
];

const PLACES = [
  'Factory',
  'Plant',
  'Refinery',
  'Foundry',
  'Outpost',
  'Hub',
  'Complex',
  'Facility',
  'Works',
  'Depot',
  'Forge',
  'Smeltery',
  'Assembly',
  'Pipeline',
  'Yard',
  'Compound',
  'Smelter',
  'Manufactory',
  'Mill',
  'Site',
];

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTag(): string {
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const number = Math.floor(Math.random() * 9) + 1;
  return `${letter}${number}`;
}

export function generateFactoryName(): string {
  return `${pick(ADJECTIVES)} ${pick(PLACES)} ${generateTag()}`;
}
