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
  'Lonely',
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
  'Fearless',
  'Daring',
  'Spirited',
  'Resolute',
  'Glittering',
];

const CREATURES = [
  'Lizard Doggo',
  'Spitter',
  'Stinger',
  'Hog',
  'Alpha Hog',
  'Cliff Hog',
  'Crab Hatcher',
  'Plasma Spitter',
  'Nuclear Hog',
  'Gas Stinger',
  'Elite Stinger',
  'Alpha Stinger',
  'Flying Crab',
  'Baby Crab',
  'Fluffy-tailed Hog',
];

const DEVICE_NAME_KEY = 'satisfactory-logistics:device-name';
const SENDER_ID_KEY = 'satisfactory-logistics:sender-id';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDeviceName(): string {
  return `${pick(ADJECTIVES)} ${pick(CREATURES)}`;
}

function readOrCreateSessionValue(key: string, factory: () => string): string {
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = factory();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    // sessionStorage may be unavailable (SSR, disabled cookies) — fall back to
    // a fresh value for this module lifetime.
    return factory();
  }
}

export const DEVICE_NAME = readOrCreateSessionValue(
  DEVICE_NAME_KEY,
  generateDeviceName,
);

export const SENDER_ID = readOrCreateSessionValue(SENDER_ID_KEY, () =>
  crypto.randomUUID(),
);
