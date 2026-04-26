import L from 'leaflet';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import {
  COLLECTIBLE_TYPE_META,
  type CollectibleType,
} from '@/recipes/WorldCollectibles';
import type { Purity } from '@/recipes/WorldResourceNodes';

// Open Color shade 5 (also Mantine defaults): red-5 / yellow-5 / green-5.
// See https://yeun.github.io/open-color/
const PURITY_RING: Record<Purity, string> = {
  impure: '#fa5252',
  normal: '#ffd43b',
  pure: '#51cf66',
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

// Pin silhouette: head circle (center (16,16), radius 10·√2 ≈ 14.14) with
// a tip at (30.14, 30.14). The two straight sides run from the tip to the
// head's rightmost tangent point (30.14, 16) and to its bottommost tangent
// point (16, 30.14); they meet at the tip at exactly 90° and the arc-to-
// line transitions are smooth (tangent = no seam). The pin natively leans
// 45° toward its upper-left, so the glyph inside the head and the corner
// badges stay upright with no CSS rotation.
const PIN_VIEW_SIZE = 32;
const PIN_HEAD_CENTER = 16;
const PIN_HEAD_RADIUS = 14.1421;
const PIN_TIP = 30.1421;
const PIN_PATH = `M ${PIN_TIP} ${PIN_TIP} L ${PIN_TIP} ${PIN_HEAD_CENTER} A ${PIN_HEAD_RADIUS} ${PIN_HEAD_RADIUS} 0 1 0 ${PIN_HEAD_CENTER} ${PIN_TIP} Z`;

interface PinIconParams {
  /** Outer SVG width in pixels; height is scaled from the pin viewBox. */
  width: number;
  /** Square icon edge (in viewBox units) painted inside the pin head. */
  innerSize: number;
  /** Path to the raster icon, when not rendering an inline glyph. */
  iconHref?: string;
  /** Inline SVG body to embed inside the pin head instead of an image. */
  inlineSvg?: string;
  ringColor: string;
  classes: string[];
  badgesHtml: string;
}

/**
 * Centralizes the pin SVG markup so resources and collectibles share
 * the exact same silhouette (just at different sizes). The icon is
 * rendered as an `<image>` (or nested `<svg>`) inside the same SVG as
 * the path, so it is guaranteed to stack above the pin without
 * fighting CSS stacking contexts.
 */
function buildPinIcon({
  width,
  innerSize,
  iconHref,
  inlineSvg,
  ringColor,
  classes,
  badgesHtml,
}: PinIconParams): L.DivIcon {
  const scale = width / PIN_VIEW_SIZE;
  const size = Math.round(PIN_VIEW_SIZE * scale);
  const tipOffset = Math.round(PIN_TIP * scale);
  // Center the icon on the pin head circle (whose center is at
  // (PIN_HEAD_CENTER, PIN_HEAD_CENTER) in viewBox units).
  const iconOffset = PIN_HEAD_CENTER - innerSize / 2;

  let iconNode = '';
  if (iconHref) {
    iconNode = `<image class="map-marker__icon" href="${iconHref}" x="${iconOffset}" y="${iconOffset}" width="${innerSize}" height="${innerSize}" preserveAspectRatio="xMidYMid meet" />`;
  } else if (inlineSvg) {
    // Tabler "outline" defaults: 24x24 viewBox, 2px stroke, no fill,
    // round caps + joins. `color` flows through to any path that uses
    // `currentColor` (the audio-tape reels, for example).
    iconNode = `<svg class="map-marker__icon" x="${iconOffset}" y="${iconOffset}" width="${innerSize}" height="${innerSize}" viewBox="0 0 24 24" color="${ringColor}" stroke="${ringColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">${inlineSvg}</svg>`;
  }

  const html = `
    <div class="${classes.join(' ')}" style="--ring:${ringColor}; width:${size}px; height:${size}px;">
      <svg class="map-marker__shape" viewBox="0 0 ${PIN_VIEW_SIZE} ${PIN_VIEW_SIZE}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path class="map-marker__shape-path" d="${PIN_PATH}" />
        ${iconNode}
      </svg>
      ${badgesHtml}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'map-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [tipOffset, tipOffset],
    // Place the popup tail above the pin's visual center (midpoint between
    // head center and tip), not the tip itself. Anchoring on the tip pushes
    // the wide popup body to the right of the pin since the tip is the
    // pin's rightmost point; centering balances it.
    popupAnchor: [
      Math.round(((PIN_HEAD_CENTER - PIN_TIP) / 2) * scale),
      -Math.round((PIN_TIP - (PIN_HEAD_CENTER - PIN_HEAD_RADIUS)) * scale),
    ],
  });
}

const RESOURCE_MARKER_WIDTH = 28;
// The pin head is a circle (center 18,18 r≈14.14), whose inscribed square
// is ~20 units. We size the icon just under that so the corners stay clear
// of the curved edge and the stroke has a sliver of room.
const RESOURCE_INNER_SIZE = 18;

export interface ResourceMarkerIconOptions {
  /**
   * When true, the marker is rendered in a dimmed "already-used"
   * variant with a checkmark badge in the top-right corner.
   */
  used?: boolean;
  /**
   * When true, the marker gets a violet "selected for comparison"
   * halo, distinct from both plain and used variants. Used + selected
   * combine (dim + halo + check).
   */
  selected?: boolean;
}

/**
 * Builds a Leaflet `divIcon` for a resource node. The marker is a
 * pin-shaped SVG silhouette (gray fill, purity-tinted stroke) with the
 * resource's in-game icon centered in its head.
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
  return buildPinIcon({
    width: RESOURCE_MARKER_WIDTH,
    innerSize: RESOURCE_INNER_SIZE,
    iconHref: imagePath,
    ringColor,
    classes,
    badgesHtml: `${usedBadge}${selectedBadge}`,
  });
}

// Slightly smaller markers for collectibles, so several collectibles
// clustered around the same biome don't crowd out the resource nodes,
// but big enough that the (mostly small) Tabler glyphs stay legible.
const COLLECTIBLE_MARKER_WIDTH = 24;
const COLLECTIBLE_INNER_SIZE = 18;

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

export interface CollectibleMarkerIconOptions {
  /** Render the marker dimmed + checkmarked (already collected). */
  collected?: boolean;
}

/**
 * Builds a Leaflet `divIcon` for a collectible. Mirrors
 * {@link getResourceMarkerIcon} so the visual language stays
 * consistent (pin silhouette + icon), but uses the collectible's
 * themed color instead of a purity color and falls back to an inline
 * Tabler glyph when the collectible has no bundled game art.
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

  if (meta.iconImagePath) {
    return buildPinIcon({
      width: COLLECTIBLE_MARKER_WIDTH,
      innerSize: COLLECTIBLE_INNER_SIZE,
      iconHref: meta.iconImagePath,
      ringColor,
      classes,
      badgesHtml: collectedBadge,
    });
  }

  return buildPinIcon({
    width: COLLECTIBLE_MARKER_WIDTH,
    innerSize: COLLECTIBLE_INNER_SIZE,
    inlineSvg: TABLER_ICON_PATHS[meta.iconName ?? ''] ?? '',
    ringColor,
    classes,
    badgesHtml: collectedBadge,
  });
}
