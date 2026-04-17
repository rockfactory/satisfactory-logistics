import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useStore } from '@/core/zustand';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import type { WorldResourceNode } from '@/recipes/WorldResourceNodes';
import { gameToLatLng } from './coords';
import {
  getExtractionRate,
  getExtractionUnit,
  getExtractorsForResource,
  OVERCLOCK_STEPS,
} from './extraction';
import { getPurityLabel, getResourceMarkerIcon } from './markerIcons';

export interface ResourceMarkersLayerProps {
  nodes: WorldResourceNode[];
  /** Ids of nodes the player has marked as "used" in the current game. */
  usedNodes: Set<string>;
  /**
   * Currently selected game id, forwarded to the `toggleNodeUsed`
   * action so used-state is scoped per game.
   */
  gameId: string | null;
  /**
   * When true, clicking a marker toggles its selection instead of
   * opening the popup. Forwarded from `mapSelection.sumMode`.
   */
  sumMode: boolean;
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
 * Builds the popup HTML for a single node. Buttons use `data-action`
 * + `data-node-id` so a single delegated click listener on the map
 * container can wire every popup's actions in one place (and survive
 * Leaflet's DOM swaps when `setPopupContent` runs).
 */
function buildPopupHtml(
  node: WorldResourceNode,
  isUsed: boolean,
  isSelected: boolean,
): string {
  const item = AllFactoryItemsMap[node.resource];
  const name = escapeHtml(item?.displayName ?? node.resource);
  const imagePath = item?.imagePath?.replace('_256', '_64') ?? '';
  const purityLabel = getPurityLabel(node.purity);
  const x = formatNumber(node.x);
  const y = formatNumber(node.y);
  const altitude =
    node.z != null ? `${formatNumber(Math.round(node.z / 100))} m` : '—';

  const extractors = getExtractorsForResource(node.resource);
  const unit = getExtractionUnit(node.resource);

  const tableRows = extractors
    .map(building => {
      const cells = OVERCLOCK_STEPS.map(step => {
        const rate = getExtractionRate(building, node.purity, step);
        return `<td>${formatNumber(rate)} <span class="map-marker-popup__rates-unit">${escapeHtml(unit)}</span></td>`;
      }).join('');
      return `<tr><th>${escapeHtml(building.name)}</th>${cells}</tr>`;
    })
    .join('');

  const headerCells = OVERCLOCK_STEPS.map(step => `<th>${step}%</th>`).join('');

  const tableHtml =
    extractors.length > 0
      ? `
        <table class="map-marker-popup__rates">
          <thead>
            <tr><th></th>${headerCells}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `
      : '';

  const usedLabel = isUsed ? 'Mark as unused' : 'Mark as used';
  const usedModifier = isUsed ? ' map-marker-popup__action--used' : '';
  const selectLabel = isSelected ? 'Remove from selection' : 'Add to selection';
  const selectModifier = isSelected
    ? ' map-marker-popup__action--selected'
    : '';
  const nodeIdAttr = escapeHtml(node.id);
  const pills = [
    isUsed
      ? '<span class="map-marker-popup__pill map-marker-popup__pill--used">Used</span>'
      : '',
    isSelected
      ? '<span class="map-marker-popup__pill map-marker-popup__pill--selected">Selected</span>'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="map-marker-popup" data-node-id="${nodeIdAttr}">
      <div class="map-marker-popup__header">
        ${imagePath ? `<img class="map-marker-popup__icon" src="${escapeHtml(imagePath)}" alt="" />` : ''}
        <div class="map-marker-popup__title">
          <div class="map-marker-popup__name">${name}${pills ? ` ${pills}` : ''}</div>
          <div class="map-marker-popup__meta">${escapeHtml(purityLabel)} purity</div>
        </div>
      </div>
      <dl class="map-marker-popup__stats">
        <dt>Coordinates</dt><dd>${x} / ${y}</dd>
        <dt>Altitude</dt><dd>${altitude}</dd>
      </dl>
      ${tableHtml}
      <div class="map-marker-popup__actions">
        <button
          type="button"
          class="map-marker-popup__action${selectModifier}"
          data-action="toggle-selected"
          data-node-id="${nodeIdAttr}"
        >${escapeHtml(selectLabel)}</button>
        <button
          type="button"
          class="map-marker-popup__action${usedModifier}"
          data-action="toggle-used"
          data-node-id="${nodeIdAttr}"
        >${escapeHtml(usedLabel)}</button>
      </div>
    </div>
  `;
}

/**
 * Imperative leaflet layer that renders the given resource nodes as
 * individual (non-clustered) markers. We bypass react-leaflet's
 * component model so all markers can share a single render pass
 * without per-marker React reconciliation cost.
 *
 * Used-node and selected-node state are applied both as visual
 * variants on the marker icon and as toggleable actions in the
 * popup. Click handling uses a single delegated listener on the map
 * container so it keeps working across Leaflet's `setPopupContent`
 * DOM swaps.
 *
 * Selected-node state is intentionally not in the effect deps — we
 * imperatively repaint only the affected marker when selection
 * changes, rather than tearing the whole layer down on every toggle.
 */
export function ResourceMarkersLayer({
  nodes,
  usedNodes,
  gameId,
  sumMode,
}: ResourceMarkersLayerProps) {
  const map = useMap();

  useEffect(() => {
    const layer = L.layerGroup();
    const markersByNodeId = new Map<string, L.Marker>();
    const nodesByNodeId = new Map<string, WorldResourceNode>();
    const getCurrentSelection = () =>
      new Set(useStore.getState().mapSelection.selectedNodeIds);

    /**
     * Repaints a single marker's icon and popup content from current
     * store state. Called after any action that might have changed
     * its used or selected status.
     */
    const repaintMarker = (nodeId: string) => {
      const marker = markersByNodeId.get(nodeId);
      const node = nodesByNodeId.get(nodeId);
      if (!marker || !node) return;
      const isUsed = usedNodes.has(nodeId);
      const isSelected = getCurrentSelection().has(nodeId);
      marker.setIcon(
        getResourceMarkerIcon(node.resource, node.purity, {
          used: isUsed,
          selected: isSelected,
        }),
      );
      // `getPopup()` is only non-null in normal mode, since compare
      // mode skips `bindPopup` entirely.
      if (marker.getPopup()) {
        marker.setPopupContent(buildPopupHtml(node, isUsed, isSelected));
      }
    };

    const initialSelection = getCurrentSelection();

    for (const node of nodes) {
      nodesByNodeId.set(node.id, node);
      const isUsed = usedNodes.has(node.id);
      const isSelected = initialSelection.has(node.id);
      const marker = L.marker(gameToLatLng(node.x, node.y), {
        icon: getResourceMarkerIcon(node.resource, node.purity, {
          used: isUsed,
          selected: isSelected,
        }),
      });

      if (sumMode) {
        // Sum mode: no popup. Click toggles selection directly.
        marker.on('click', event => {
          L.DomEvent.stopPropagation(event);
          useStore.getState().toggleNodeSelected(node.id);
          repaintMarker(node.id);
        });
      } else {
        // Normal mode: click opens popup. Selection is managed from
        // the popup's "Add to selection" action. `maxWidth` is high
        // enough to fit the widest content we produce — two
        // extractors × 5 overclock columns × `m³/min` units — while
        // still letting Leaflet auto-size narrower popups naturally.
        marker.bindPopup(buildPopupHtml(node, isUsed, isSelected), {
          closeButton: true,
          offset: [0, -4],
          maxWidth: 720,
        });
      }

      markersByNodeId.set(node.id, marker);
      layer.addLayer(marker);
    }

    layer.addTo(map);

    // Delegated click listener for popup action buttons — one per
    // effect run, attached to the map's root element.
    const container = map.getContainer();
    const onDelegatedClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest<HTMLButtonElement>(
        'button[data-action][data-node-id]',
      );
      if (!button) return;

      const nodeId = button.dataset.nodeId;
      const action = button.dataset.action;
      if (!nodeId || !action) return;

      event.preventDefault();
      event.stopPropagation();

      if (action === 'toggle-used') {
        useStore.getState().toggleNodeUsed(gameId, nodeId);
      } else if (action === 'toggle-selected') {
        useStore.getState().toggleNodeSelected(nodeId);
      } else {
        return;
      }

      repaintMarker(nodeId);
    };

    container.addEventListener('click', onDelegatedClick);

    // Keep every marker's "selected" visual in sync with store
    // changes that didn't originate from a click on this marker
    // (e.g. clearing the selection from the summary panel). We
    // diff the new vs old selection and repaint only what changed.
    let lastSelection = initialSelection;
    const unsubscribeSelection = useStore.subscribe(state => {
      const next = new Set(state.mapSelection.selectedNodeIds);
      if (next.size === lastSelection.size) {
        let identical = true;
        for (const id of next) {
          if (!lastSelection.has(id)) {
            identical = false;
            break;
          }
        }
        if (identical) return;
      }
      // Repaint every id that flipped in either direction.
      for (const id of next) if (!lastSelection.has(id)) repaintMarker(id);
      for (const id of lastSelection) if (!next.has(id)) repaintMarker(id);
      lastSelection = next;
    });

    return () => {
      unsubscribeSelection();
      container.removeEventListener('click', onDelegatedClick);
      layer.removeFrom(map);
    };
    // `sumMode` is in the deps so we fully rebind markers whenever
    // the mode flips — compact and unambiguous behaviour vs. trying
    // to detach/attach click handlers on the fly.
  }, [map, nodes, usedNodes, gameId, sumMode]);

  return null;
}
