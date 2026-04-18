import L from 'leaflet';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import {
  COLLECTIBLE_TYPE_META,
  type CollectibleType,
} from '@/recipes/WorldCollectibles';
import type { Purity } from '@/recipes/WorldResourceNodes';

const PURITY_RING: Record<Purity, string> = {
  impure: '#e74c3c',
  normal: '#f1c40f',
  pure: '#2ecc71',
};

const PURITY_LABEL: Record<Purity, string> = {
  impure: 'Impure',
  normal: 'Normal',
  pure: 'Pure',
};

export function getPurityColor(purity: Purity): string {
  return PURITY_RING[purity];
}

export function getPurityLabel(purity: Purity): string {
  return PURITY_LABEL[purity];
}

const ICON_SIZE = 36;
const INNER_SIZE = 26;
/**
 * Height of the downward "pin tip" rendered under each marker. The
 * marker icon visually points at this many pixels below the ring's
 * bottom edge, so we anchor markers `ICON_SIZE + POINTER_HEIGHT`
 * below their top-left corner instead of centering them. This lets
 * the player tell exactly where on the world a node sits.
 */
const POINTER_HEIGHT = 6;

export interface ResourceMarkerIconOptions {
  /**
   * When true, the marker is rendered in a dimmed "already-used"
   * variant with a checkmark badge in the top-right corner.
   */
  used?: boolean;
  /**
   * When true, the marker gets a purple "selected for comparison"
   * ring around the purity ring, distinct from both plain and used
   * variants. Used + selected combine (dim + ring + check).
   */
  selected?: boolean;
}

/**
 * Builds a Leaflet `divIcon` that displays the resource's in-game icon
 * inside a purity-tinted ring. We draw the ring and image with raw HTML
 * so all markers can share a single React-free path (Leaflet manages
 * marker DOM directly).
 */
export function getResourceMarkerIcon(
  resource: string,
  purity: Purity,
  options: ResourceMarkerIconOptions = {},
): L.DivIcon {
  const item = AllFactoryItemsMap[resource];
  const imagePath = item?.imagePath?.replace('_256', '_64') ?? '';
  const ringColor = PURITY_RING[purity];
  const classes = ['map-marker'];
  if (options.used) classes.push('map-marker--used');
  if (options.selected) classes.push('map-marker--selected');
  const usedBadge = options.used
    ? '<div class="map-marker__used-badge" aria-hidden="true">✓</div>'
    : '';
  const selectedBadge = options.selected
    ? '<div class="map-marker__selected-badge" aria-hidden="true">✦</div>'
    : '';
  const totalHeight = ICON_SIZE + POINTER_HEIGHT;
  const html = `
    <div class="${classes.join(' ')}" style="--ring:${ringColor}; width:${ICON_SIZE}px; height:${ICON_SIZE}px;">
      <div class="map-marker__inner" style="width:${INNER_SIZE}px; height:${INNER_SIZE}px; background-image:url('${imagePath}');"></div>
      <div class="map-marker__pointer" aria-hidden="true"></div>
      ${usedBadge}
      ${selectedBadge}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'map-marker-wrapper',
    iconSize: [ICON_SIZE, totalHeight],
    iconAnchor: [ICON_SIZE / 2, totalHeight],
    popupAnchor: [0, -totalHeight],
  });
}

/**
 * Slightly smaller markers for collectibles, so several collectibles
 * clustered around the same biome don't crowd out the resource nodes.
 */
const COLLECTIBLE_ICON_SIZE = 28;
const COLLECTIBLE_INNER_SIZE = 18;
/** Smaller pointer matched to the collectible icon footprint. */
const COLLECTIBLE_POINTER_HEIGHT = 5;

/**
 * Inline SVG fallbacks for collectible types whose game art isn't
 * bundled (drop pods, audio tapes, customization unlocks). Keyed by
 * the Tabler icon name from {@link COLLECTIBLE_TYPE_META}.iconName.
 *
 * Source: `@tabler/icons` (MIT). We inline the path data directly so
 * the imperative marker DOM doesn't need React's renderToString and
 * the bundle stays small.
 */
const TABLER_ICON_PATHS: Record<string, string> = {
  IconPackage: [
    'M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5',
    'M12 12l8 -4.5',
    'M12 12l0 9',
    'M12 12l-8 -4.5',
    'M16 5.25l-8 4.5',
  ]
    .map(d => `<path d="${d}" />`)
    .join(''),
  IconDeviceAudioTape: [
    [
      'M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10',
      null,
    ],
    ['M3 17l4 -3h10l4 3', null],
    ['M7 9.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0', 'currentColor'],
    ['M16 9.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0', 'currentColor'],
  ]
    .map(([d, fill]) =>
      fill ? `<path d="${d}" fill="${fill}" />` : `<path d="${d}" />`,
    )
    .join(''),
  IconBrush: [
    'M3 21v-4a4 4 0 1 1 4 4h-4',
    'M21 3a16 16 0 0 0 -12.8 10.2',
    'M21 3a16 16 0 0 1 -10.2 12.8',
    'M10.6 9a9 9 0 0 1 4.4 4.4',
  ]
    .map(d => `<path d="${d}" />`)
    .join(''),
};

function buildTablerSvg(name: string, color: string): string {
  const paths = TABLER_ICON_PATHS[name];
  if (!paths) return '';
  // Tabler "outline" defaults: 24x24 viewBox, 2px stroke, no fill,
  // round caps + joins.
  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      stroke="${color}"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      width="100%"
      height="100%"
    >${paths}</svg>
  `;
}

export interface CollectibleMarkerIconOptions {
  /** Render the marker dimmed + checkmarked (already collected). */
  collected?: boolean;
}

/**
 * Builds a Leaflet `divIcon` for a collectible. Mirrors
 * {@link getResourceMarkerIcon} so the visual language stays
 * consistent — circular ring around an icon — but uses the
 * collectible's themed color instead of a purity color, and falls
 * back to an inline SVG when the collectible has no bundled game art.
 *
 * The "selected" / sum-mode variant is intentionally absent:
 * collectibles aren't part of the sum-mode flow (they have no
 * extraction rate to sum).
 */
export function getCollectibleMarkerIcon(
  type: CollectibleType,
  options: CollectibleMarkerIconOptions = {},
): L.DivIcon {
  const meta = COLLECTIBLE_TYPE_META[type];
  const ringColor = meta.color;
  const classes = ['map-marker', 'map-marker--collectible'];
  if (options.collected) classes.push('map-marker--used');
  const collectedBadge = options.collected
    ? '<div class="map-marker__used-badge" aria-hidden="true">✓</div>'
    : '';

  const innerHtml = meta.iconImagePath
    ? `<div class="map-marker__inner" style="width:${COLLECTIBLE_INNER_SIZE}px; height:${COLLECTIBLE_INNER_SIZE}px; background-image:url('${meta.iconImagePath}');"></div>`
    : `<div class="map-marker__inner map-marker__inner--svg" style="width:${COLLECTIBLE_INNER_SIZE}px; height:${COLLECTIBLE_INNER_SIZE}px; color:${ringColor};">${buildTablerSvg(
        meta.iconName ?? '',
        ringColor,
      )}</div>`;

  const totalHeight = COLLECTIBLE_ICON_SIZE + COLLECTIBLE_POINTER_HEIGHT;
  const html = `
    <div class="${classes.join(' ')}" style="--ring:${ringColor}; width:${COLLECTIBLE_ICON_SIZE}px; height:${COLLECTIBLE_ICON_SIZE}px;">
      ${innerHtml}
      <div class="map-marker__pointer map-marker__pointer--sm" aria-hidden="true"></div>
      ${collectedBadge}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'map-marker-wrapper',
    iconSize: [COLLECTIBLE_ICON_SIZE, totalHeight],
    iconAnchor: [COLLECTIBLE_ICON_SIZE / 2, totalHeight],
    popupAnchor: [0, -totalHeight],
  });
}
