import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useStore } from '@/core/zustand';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import {
  COLLECTIBLE_TYPE_META,
  type WorldCollectible,
} from '@/recipes/WorldCollectibles';
import { gameToLatLng } from './coords';
import { getCollectibleMarkerIcon } from './markerIcons';

export interface CollectibleMarkersLayerProps {
  collectibles: WorldCollectible[];
  /**
   * Ids of collectibles the player has marked as collected in the
   * current game.
   */
  collectedIds: Set<string>;
  /**
   * Currently selected game id, forwarded to `toggleGameCollectedItem`
   * so collected-state is scoped per game.
   */
  gameId: string | null;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] ?? ch);
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Builds the popup HTML for a single collectible. Same delegated-
 * click pattern as `ResourceMarkersLayer` so toggling "collected"
 * survives Leaflet's `setPopupContent` DOM swap.
 */
function buildPopupHtml(
  collectible: WorldCollectible,
  isCollected: boolean,
): string {
  const meta = COLLECTIBLE_TYPE_META[collectible.type];
  const name = escapeHtml(meta.displayName);
  const description = escapeHtml(meta.description);
  const x = formatNumber(collectible.x);
  const y = formatNumber(collectible.y);
  const altitude =
    collectible.z != null
      ? `${formatNumber(Math.round(collectible.z / 100))} m`
      : '—';

  const iconHtml = meta.iconImagePath
    ? `<img class="map-marker-popup__icon" src="${escapeHtml(meta.iconImagePath)}" alt="" />`
    : '';

  // Drop-pod-only: render the unlock cost as a row of icon + amount
  // chips. Lookups in `AllFactoryItemsMap` give us the displayName +
  // image so the player can recognize what they need at a glance.
  const unlockCost = collectible.unlockCost ?? [];
  const unlockHtml =
    unlockCost.length > 0
      ? `
        <div class="map-marker-popup__cost">
          <span class="map-marker-popup__cost-label">Unlock cost</span>
          <div class="map-marker-popup__cost-items">
            ${unlockCost
              .map(({ item, amount }) => {
                const itemMeta = AllFactoryItemsMap[item];
                const itemName = escapeHtml(itemMeta?.displayName ?? item);
                const imagePath =
                  itemMeta?.imagePath?.replace('_256', '_64') ?? '';
                const imageHtml = imagePath
                  ? `<img src="${escapeHtml(imagePath)}" alt="" />`
                  : '';
                return `
                  <span class="map-marker-popup__cost-chip" title="${itemName}">
                    ${imageHtml}
                    <span>${formatNumber(amount)}× ${itemName}</span>
                  </span>
                `;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

  // Audio-tape-only: the schematic id reads as a tracklist hint
  // ("Schematic_Huntdown_C" -> "Huntdown"). We strip the prefix +
  // suffix for display since there's no localized title in the dump.
  const schematicHtml =
    collectible.schematicId != null
      ? (() => {
          const trimmed = collectible.schematicId
            .replace(/^Schematic_/, '')
            .replace(/_C$/, '');
          return `<dt>Tape</dt><dd>${escapeHtml(trimmed)}</dd>`;
        })()
      : '';

  const collectedBadge = isCollected
    ? '<span class="map-marker-popup__pill map-marker-popup__pill--used">Collected</span>'
    : '';
  const collectedLabel = isCollected
    ? 'Mark as not collected'
    : 'Mark as collected';
  const collectedModifier = isCollected
    ? ' map-marker-popup__action--used'
    : '';
  const idAttr = escapeHtml(collectible.id);

  return `
    <div class="map-marker-popup" data-collectible-id="${idAttr}">
      <div class="map-marker-popup__header">
        ${iconHtml}
        <div class="map-marker-popup__title">
          <div class="map-marker-popup__name">${name}${
            collectedBadge ? ` ${collectedBadge}` : ''
          }</div>
          <div class="map-marker-popup__meta">${escapeHtml(meta.shortName)}</div>
        </div>
      </div>
      <p class="map-marker-popup__method">${description}</p>
      <dl class="map-marker-popup__stats">
        <dt>Coordinates</dt><dd>${x} / ${y}</dd>
        <dt>Altitude</dt><dd>${altitude}</dd>
        ${schematicHtml}
      </dl>
      ${unlockHtml}
      <div class="map-marker-popup__actions">
        <button
          type="button"
          class="map-marker-popup__action${collectedModifier}"
          data-action="toggle-collected"
          data-collectible-id="${idAttr}"
        >${escapeHtml(collectedLabel)}</button>
      </div>
    </div>
  `;
}

/**
 * Imperative leaflet layer that renders the given collectibles as
 * individual markers. Mirrors `ResourceMarkersLayer` but for the
 * collectible track:
 *
 * - No purity, no extractor — markers are themed by `CollectibleType`.
 * - No sum mode — collectibles aren't part of the per-rate aggregation.
 * - "Collected" replaces "used" semantically; we reuse the same
 *   visual variant on the marker (dim + checkmark) since it reads
 *   identically on the map.
 *
 * Click handling uses a single delegated listener on the map
 * container, scoped to `[data-action][data-collectible-id]` so it
 * doesn't conflict with the resource layer's
 * `[data-action][data-node-id]` listener.
 */
export function CollectibleMarkersLayer({
  collectibles,
  collectedIds,
  gameId,
}: CollectibleMarkersLayerProps) {
  const map = useMap();

  useEffect(() => {
    const layer = L.layerGroup();
    const markersById = new Map<string, L.Marker>();
    const collectiblesById = new Map<string, WorldCollectible>();

    const repaintMarker = (id: string) => {
      const marker = markersById.get(id);
      const collectible = collectiblesById.get(id);
      if (!marker || !collectible) return;
      const isCollected = collectedIds.has(id);
      marker.setIcon(
        getCollectibleMarkerIcon(collectible.type, { collected: isCollected }),
      );
      if (marker.getPopup()) {
        marker.setPopupContent(buildPopupHtml(collectible, isCollected));
      }
    };

    for (const collectible of collectibles) {
      collectiblesById.set(collectible.id, collectible);
      const isCollected = collectedIds.has(collectible.id);
      const marker = L.marker(gameToLatLng(collectible.x, collectible.y), {
        icon: getCollectibleMarkerIcon(collectible.type, {
          collected: isCollected,
        }),
      });
      marker.bindPopup(buildPopupHtml(collectible, isCollected), {
        closeButton: true,
        offset: [0, -4],
        maxWidth: 320,
      });
      markersById.set(collectible.id, marker);
      layer.addLayer(marker);
    }

    layer.addTo(map);

    const container = map.getContainer();
    const onDelegatedClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest<HTMLButtonElement>(
        'button[data-action][data-collectible-id]',
      );
      if (!button) return;

      const id = button.dataset.collectibleId;
      const action = button.dataset.action;
      if (!id || action !== 'toggle-collected') return;

      event.preventDefault();
      event.stopPropagation();

      useStore.getState().toggleGameCollectedItem(gameId, id);
      repaintMarker(id);
    };

    container.addEventListener('click', onDelegatedClick);

    return () => {
      container.removeEventListener('click', onDelegatedClick);
      layer.removeFrom(map);
    };
  }, [map, collectibles, collectedIds, gameId]);

  return null;
}
