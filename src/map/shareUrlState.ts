import {
  COLLECTIBLE_TYPES,
  type CollectibleType,
} from '@/recipes/WorldCollectibles';
import { PURITIES, type Purity } from '@/recipes/WorldResourceNodes';
import { WorldResourcesList } from '@/recipes/WorldResources';

/**
 * Compact, sharable representation of the map view + filter state.
 * Encoded into the URL hash so refreshes restore the view and other
 * players can open someone's link to the exact same map. This is
 * intentionally a *snapshot* of view-style state — personal marks
 * (used nodes, collected collectibles) are persisted only in the
 * recipient's own indexedDB store and never travel through the URL.
 */
export interface ShareableMapState {
  /** Leaflet zoom level. */
  zoom: number;
  /** Leaflet `LatLng` center as `[lat, lng]`. */
  center: [number, number];
  /**
   * Per-resource purity selection. Same shape as
   * `MapSlice.resourceFilters`: a missing key hides the resource
   * entirely; an empty array hides all purities for it.
   */
  resourceFilters: Record<string, Purity[]>;
  /** Per-collectible-type visibility. */
  collectibleVisibility: Record<CollectibleType, boolean>;
  /** Hide already-used nodes from the render. */
  hideUsedNodes: boolean;
  /** Hide already-collected collectibles from the render. */
  hideCollectedCollectibles: boolean;
}

/**
 * Bumped if the encoding format changes in a backwards-incompatible
 * way (e.g. resources renamed). Older URLs without `v` are treated
 * as v1 for forward-safety.
 */
const SCHEMA_VERSION = 1;

/** Single character per purity, in {@link PURITIES} order. */
const PURITY_CHAR: Record<Purity, string> = {
  impure: 'I',
  normal: 'N',
  pure: 'P',
};
const PURITY_FROM_CHAR: Record<string, Purity> = {
  I: 'impure',
  N: 'normal',
  P: 'pure',
};

/**
 * Strip the verbose `Desc_…_C` wrapper for compactness in the URL.
 * `Desc_OreIron_C` → `OreIron`. We re-wrap on parse, and validate
 * against `WorldResourcesList` so unknown ids are dropped instead
 * of poisoning the filter state.
 */
function shortenResourceId(id: string): string {
  return id.replace(/^Desc_/, '').replace(/_C$/, '');
}
function expandResourceId(short: string): string | null {
  const candidate = `Desc_${short}_C`;
  return WorldResourcesList.includes(candidate) ? candidate : null;
}

/**
 * Two-character codes for collectible types. Hand-picked so they
 * stay stable when we add types later (don't reuse codes).
 */
const COLLECTIBLE_CODE: Record<CollectibleType, string> = {
  slugMk1: 's1',
  slugMk2: 's2',
  slugMk3: 's3',
  somersloop: 'sl',
  mercerSphere: 'ms',
  hardDrive: 'hd',
  audioTape: 'at',
  customizationUnlock: 'cu',
};
const COLLECTIBLE_FROM_CODE: Record<string, CollectibleType> = (() => {
  const m: Record<string, CollectibleType> = {};
  for (const t of COLLECTIBLE_TYPES) m[COLLECTIBLE_CODE[t]] = t;
  return m;
})();

function defaultResourceFilters(): Record<string, Purity[]> {
  const filters: Record<string, Purity[]> = {};
  for (const r of WorldResourcesList) filters[r] = [...PURITIES];
  return filters;
}

function defaultCollectibleVisibility(): Record<CollectibleType, boolean> {
  const v = {} as Record<CollectibleType, boolean>;
  for (const t of COLLECTIBLE_TYPES) v[t] = false;
  return v;
}

/**
 * Compares the given filter map to the "everything visible" default.
 * When equal, we omit `rf` from the URL entirely so default-state
 * links stay short.
 */
function isDefaultResourceFilters(filters: Record<string, Purity[]>): boolean {
  if (Object.keys(filters).length !== WorldResourcesList.length) return false;
  for (const r of WorldResourcesList) {
    const purities = filters[r];
    if (!purities || purities.length !== PURITIES.length) return false;
    for (const p of PURITIES) if (!purities.includes(p)) return false;
  }
  return true;
}

/**
 * Compares to the "all collectibles hidden" default. When equal we
 * omit `cv` from the URL.
 */
function isDefaultCollectibleVisibility(
  visibility: Record<CollectibleType, boolean>,
): boolean {
  for (const t of COLLECTIBLE_TYPES) if (visibility[t]) return false;
  return true;
}

function encodeResourceFilters(filters: Record<string, Purity[]>): string {
  const parts: string[] = [];
  for (const resource of WorldResourcesList) {
    const purities = filters[resource];
    if (!purities || purities.length === 0) continue;
    const letters = PURITIES.filter(p => purities.includes(p))
      .map(p => PURITY_CHAR[p])
      .join('');
    parts.push(`${shortenResourceId(resource)}:${letters}`);
  }
  return parts.join(',');
}

function decodeResourceFilters(
  raw: string | null,
): Record<string, Purity[]> | null {
  if (raw == null) return null;
  // An explicit empty `rf=` string means "all hidden", distinct from
  // the absence of the key (which means "use default = all visible").
  if (raw.length === 0) return {};
  const out: Record<string, Purity[]> = {};
  for (const segment of raw.split(',')) {
    const [shortId, lettersRaw = ''] = segment.split(':');
    const fullId = expandResourceId(shortId);
    if (!fullId) continue;
    const purities: Purity[] = [];
    for (const ch of lettersRaw.toUpperCase()) {
      const p = PURITY_FROM_CHAR[ch];
      if (p && !purities.includes(p)) purities.push(p);
    }
    if (purities.length > 0) out[fullId] = purities;
  }
  return out;
}

function encodeCollectibleVisibility(
  visibility: Record<CollectibleType, boolean>,
): string {
  return COLLECTIBLE_TYPES.filter(t => visibility[t])
    .map(t => COLLECTIBLE_CODE[t])
    .join(',');
}

function decodeCollectibleVisibility(
  raw: string | null,
): Record<CollectibleType, boolean> | null {
  if (raw == null) return null;
  const v = defaultCollectibleVisibility();
  if (raw.length === 0) return v;
  for (const code of raw.split(',')) {
    const type = COLLECTIBLE_FROM_CODE[code.trim()];
    if (type) v[type] = true;
  }
  return v;
}

/**
 * Serializes the given state into a URLSearchParams instance ready
 * to be stuffed into `location.hash`. Keys present in the result:
 *
 * - `v` (schema version) — always present so we can identify our
 *   own URLs vs. unrelated query strings on the same path.
 * - `z` (zoom)
 * - `c` (center, `lat,lng`)
 * - `rf` (resource filters) — omitted when equal to "show everything".
 * - `cv` (collectible visibility) — omitted when no types are visible.
 * - `hu` / `hc` (hide flags) — omitted when false.
 *
 * Numeric values are rounded to keep URLs short while still being
 * accurate enough that the recipient sees roughly the same framing.
 */
export function encodeShareUrl(state: ShareableMapState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('v', String(SCHEMA_VERSION));
  params.set('z', roundFloat(state.zoom, 2));
  params.set(
    'c',
    `${roundFloat(state.center[0], 2)},${roundFloat(state.center[1], 2)}`,
  );
  if (!isDefaultResourceFilters(state.resourceFilters)) {
    params.set('rf', encodeResourceFilters(state.resourceFilters));
  }
  if (!isDefaultCollectibleVisibility(state.collectibleVisibility)) {
    params.set('cv', encodeCollectibleVisibility(state.collectibleVisibility));
  }
  if (state.hideUsedNodes) params.set('hu', '1');
  if (state.hideCollectedCollectibles) params.set('hc', '1');
  return params;
}

/**
 * Parses a hash string into a partial {@link ShareableMapState}.
 * Returns `null` when the hash doesn't look like one of ours
 * (missing schema version) so unrelated hashes — e.g. a `#section`
 * link — don't blow away the user's local state.
 *
 * Each field is independently optional: an old URL without `cv`
 * leaves the recipient's collectible visibility untouched.
 */
export function decodeShareUrl(
  hash: string,
): Partial<ShareableMapState> | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  if (trimmed.length === 0) return null;
  const params = new URLSearchParams(trimmed);
  if (!params.has('v')) return null;

  const out: Partial<ShareableMapState> = {};

  const zoomRaw = params.get('z');
  if (zoomRaw != null) {
    const z = Number(zoomRaw);
    if (Number.isFinite(z)) out.zoom = z;
  }

  const centerRaw = params.get('c');
  if (centerRaw != null) {
    const [latRaw, lngRaw] = centerRaw.split(',');
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.center = [lat, lng];
  }

  const rf = decodeResourceFilters(params.get('rf'));
  if (rf != null) out.resourceFilters = rf;

  const cv = decodeCollectibleVisibility(params.get('cv'));
  if (cv != null) out.collectibleVisibility = cv;

  if (params.has('hu')) out.hideUsedNodes = params.get('hu') === '1';
  if (params.has('hc'))
    out.hideCollectedCollectibles = params.get('hc') === '1';

  return out;
}

function roundFloat(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  return String(Math.round(value * factor) / factor);
}

/**
 * Compares two {@link ShareableMapState} instances for value
 * equality. Used by the live-sync writer to skip redundant URL
 * rewrites when nothing has actually changed (panning often fires
 * `moveend` even when the center didn't shift after rounding).
 */
export function shareUrlsEqual(
  a: URLSearchParams,
  b: URLSearchParams,
): boolean {
  if (a.toString() === b.toString()) return true;
  // Order-insensitive equality fallback in case the browser
  // re-serializes our hash in a different order on round-trip.
  const aKeys = Array.from(a.keys()).sort();
  const bKeys = Array.from(b.keys()).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a.get(aKeys[i]) !== b.get(bKeys[i])) return false;
  }
  return true;
}
