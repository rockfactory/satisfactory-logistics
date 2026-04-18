import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useShallowStore } from '@/core/zustand';
import {
  COLLECTIBLE_TYPES,
  type CollectibleType,
  getWorldCollectibles,
} from '@/recipes/WorldCollectibles';
import {
  getWorldResourceNodes,
  type Purity,
} from '@/recipes/WorldResourceNodes';
import { CollectibleMarkersLayer } from './CollectibleMarkersLayer';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  IMAGE_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
} from './coords';
import { MapSelectionSummary } from './MapSelectionSummary';
import { ResourceMarkersLayer } from './ResourceMarkersLayer';
import { ShareUrlSync } from './ShareUrlSync';
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
/** Stable fallback for collectible visibility before rehydrate finishes. */
const EMPTY_COLLECTIBLE_VISIBILITY: Record<CollectibleType, boolean> = (() => {
  const visibility = {} as Record<CollectibleType, boolean>;
  for (const type of COLLECTIBLE_TYPES) visibility[type] = true;
  return visibility;
})();
/** Stable fallback for the per-game collected map. */
const EMPTY_COLLECTED_BY_GAME: Record<string, string[]> = {};
/** Stable empty list mirror of `EMPTY_USED_NODES` for collectibles. */
const EMPTY_COLLECTED_LIST: readonly string[] = [];

/** Marker scale at the min and max zoom levels; linearly interpolated between. */
const MARKER_SCALE_AT_MIN_ZOOM = 0.75;
const MARKER_SCALE_AT_MAX_ZOOM = 1.75;

/**
 * Writes `--marker-zoom-scale` on the Leaflet container so `.map-marker`
 * can scale its transform with the current zoom level — markers grow as
 * you zoom in, shrink as you zoom out.
 */
function MarkerZoomScaleController() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const apply = () => {
      const zoomRange = MAX_ZOOM - MIN_ZOOM || 1;
      const t = (map.getZoom() - MIN_ZOOM) / zoomRange;
      const scale =
        MARKER_SCALE_AT_MIN_ZOOM +
        t * (MARKER_SCALE_AT_MAX_ZOOM - MARKER_SCALE_AT_MIN_ZOOM);
      container.style.setProperty('--marker-zoom-scale', scale.toFixed(3));
    };
    apply();
    map.on('zoomend', apply);
    return () => {
      map.off('zoomend', apply);
      container.style.removeProperty('--marker-zoom-scale');
    };
  }, [map]);
  return null;
}

export function WorldMapView({ gameId }: WorldMapViewProps) {
  const {
    resourceFilters,
    hideUsedNodes,
    usedNodesList,
    sumMode,
    collectibleVisibility,
    hideCollectedCollectibles,
    collectedList,
  } = useShallowStore(state => {
    const mapState = state.map;
    const usedByGame = mapState?.usedNodesByGame ?? EMPTY_USED_BY_GAME;
    const collectedByGame =
      mapState?.collectedByGame ?? EMPTY_COLLECTED_BY_GAME;
    return {
      resourceFilters: mapState?.resourceFilters ?? EMPTY_RESOURCE_FILTERS,
      hideUsedNodes: mapState?.hideUsedNodes ?? false,
      usedNodesList:
        usedByGame[gameId ?? NO_GAME_USED_NODES_KEY] ?? EMPTY_USED_NODES,
      sumMode: state.mapSelection?.sumMode ?? false,
      collectibleVisibility:
        mapState?.collectibleVisibility ?? EMPTY_COLLECTIBLE_VISIBILITY,
      hideCollectedCollectibles: mapState?.hideCollectedCollectibles ?? false,
      collectedList:
        collectedByGame[gameId ?? NO_GAME_USED_NODES_KEY] ??
        EMPTY_COLLECTED_LIST,
    };
  });

  const usedNodes = useMemo(() => new Set(usedNodesList), [usedNodesList]);
  const collectedIds = useMemo(() => new Set(collectedList), [collectedList]);

  const filteredNodes = useMemo(() => {
    return getWorldResourceNodes(gameId).filter(node => {
      if (!resourceFilters[node.resource]?.includes(node.purity)) return false;
      if (hideUsedNodes && usedNodes.has(node.id)) return false;
      return true;
    });
  }, [gameId, resourceFilters, hideUsedNodes, usedNodes]);

  const filteredCollectibles = useMemo(() => {
    return getWorldCollectibles().filter(collectible => {
      if (!collectibleVisibility[collectible.type]) return false;
      if (hideCollectedCollectibles && collectedIds.has(collectible.id))
        return false;
      return true;
    });
  }, [collectibleVisibility, hideCollectedCollectibles, collectedIds]);

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
        <MarkerZoomScaleController />
        <ResourceMarkersLayer
          nodes={filteredNodes}
          usedNodes={usedNodes}
          gameId={gameId ?? null}
          sumMode={sumMode}
        />
        <CollectibleMarkersLayer
          collectibles={filteredCollectibles}
          collectedIds={collectedIds}
          gameId={gameId ?? null}
        />
        <ShareUrlSync />
      </MapContainer>
      <div className={classes.nodeCount}>
        {filteredNodes.length} node{filteredNodes.length === 1 ? '' : 's'}
        {' · '}
        {filteredCollectibles.length} collectible
        {filteredCollectibles.length === 1 ? '' : 's'}
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
