import L from 'leaflet';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
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
  const html = `
    <div class="${classes.join(' ')}" style="--ring:${ringColor}; width:${ICON_SIZE}px; height:${ICON_SIZE}px;">
      <div class="map-marker__inner" style="width:${INNER_SIZE}px; height:${INNER_SIZE}px; background-image:url('${imagePath}');"></div>
      ${usedBadge}
      ${selectedBadge}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'map-marker-wrapper',
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
    popupAnchor: [0, -ICON_SIZE / 2],
  });
}
