import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useShallowStore } from '@/core/zustand';
import {
  getWorldResourceNodes,
  type Purity,
} from '@/recipes/WorldResourceNodes';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  IMAGE_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
} from './coords';
import { MapSelectionSummary } from './MapSelectionSummary';
import { ResourceMarkersLayer } from './ResourceMarkersLayer';
import { NO_GAME_USED_NODES_KEY } from './store/mapSlice';
import classes from './WorldMapView.module.css';

const DEFAULT_TILES_BASE_URL =
  'https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v1';

const TILES_BASE_URL =
  import.meta.env.VITE_MAP_TILES_BASE_URL ?? DEFAULT_TILES_BASE_URL;

export interface WorldMapViewProps {
  gameId?: string | null;
}

/**
 * Shared empty array so the `usedNodesList` selector returns a stable
 * reference when the current game has no used-node marks. Prevents
 * `useShallow` from treating the slice as "changed" every render.
 */
const EMPTY_USED_NODES: readonly string[] = [];
/** Stable fallback for `resourceFilters` when the slice hasn't rehydrated yet. */
const EMPTY_RESOURCE_FILTERS: Record<string, Purity[]> = {};
/** Stable fallback for the per-game used-node map in mid-rehydrate states. */
const EMPTY_USED_BY_GAME: Record<string, string[]> = {};

export function WorldMapView({ gameId }: WorldMapViewProps) {
  const { resourceFilters, hideUsedNodes, usedNodesList, sumMode } =
    useShallowStore(state => {
      const mapState = state.map;
      const usedByGame = mapState?.usedNodesByGame ?? EMPTY_USED_BY_GAME;
      return {
        resourceFilters: mapState?.resourceFilters ?? EMPTY_RESOURCE_FILTERS,
        hideUsedNodes: mapState?.hideUsedNodes ?? false,
        usedNodesList:
          usedByGame[gameId ?? NO_GAME_USED_NODES_KEY] ?? EMPTY_USED_NODES,
        sumMode: state.mapSelection?.sumMode ?? false,
      };
    });

  const usedNodes = useMemo(() => new Set(usedNodesList), [usedNodesList]);

  const filteredNodes = useMemo(() => {
    return getWorldResourceNodes(gameId).filter(node => {
      if (!resourceFilters[node.resource]?.includes(node.purity)) return false;
      if (hideUsedNodes && usedNodes.has(node.id)) return false;
      return true;
    });
  }, [gameId, resourceFilters, hideUsedNodes, usedNodes]);

  return (
    <div className={classes.mapShell} data-tutorial-id="map-canvas">
      <MapContainer
        crs={L.CRS.Simple}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={IMAGE_BOUNDS}
        attributionControl={false}
        className={classes.map}
      >
        <TileLayer
          url={`${TILES_BASE_URL}/{z}/{x}/{y}.webp`}
          tileSize={256}
          noWrap
          bounds={IMAGE_BOUNDS}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        />
        <ResourceMarkersLayer
          nodes={filteredNodes}
          usedNodes={usedNodes}
          gameId={gameId ?? null}
          sumMode={sumMode}
        />
      </MapContainer>
      <div className={classes.nodeCount}>
        {filteredNodes.length} node{filteredNodes.length === 1 ? '' : 's'}{' '}
        visible
      </div>
      {sumMode ? (
        <div className={classes.sumBanner}>
          Sum mode — tap nodes to add or remove them from the total
        </div>
      ) : null}
      <MapSelectionSummary gameId={gameId ?? null} />
    </div>
  );
}
