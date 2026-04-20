import { Progress, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useShallowStore, useStore } from '@/core/zustand';
import { useSavegameImport } from '@/recipes/savegame/useSavegameImport';
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
import classes from './WorldMapView.module.css';

const DEFAULT_TILES_BASE_URL =
  'https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v2';

/**
 * `detectRetina` on the TileLayer internally bumps zoomOffset by 1 and
 * decrements its own maxZoom by 1 (it uses tiles from one pyramid
 * level above). If the map is allowed to reach the raw `MAX_ZOOM`, the
 * TileLayer bails out at that level with no render (grey screen).
 * Retina users already see native-density data at `MAX_ZOOM - 1` (it
 * pulls from the highest URL zoom behind the scenes), so capping the
 * UI zoom to one step below matches what non-retina users get at
 * `MAX_ZOOM` without the bail.
 */
const EFFECTIVE_MAX_ZOOM = L.Browser.retina ? MAX_ZOOM - 1 : MAX_ZOOM;

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
/** Stable fallback for collectible visibility before rehydrate finishes. */
const EMPTY_COLLECTIBLE_VISIBILITY: Record<CollectibleType, boolean> = (() => {
  const visibility = {} as Record<CollectibleType, boolean>;
  for (const type of COLLECTIBLE_TYPES) visibility[type] = true;
  return visibility;
})();
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

/**
 * Mantine forwards an `Accept` object straight to react-dropzone's
 * `accept` option. Passing the bare `['.sav']` array form would
 * make react-dropzone validate `.sav` as a MIME type and spam
 * `Skipped ".sav" because it is not a valid MIME type` warnings on
 * every drag. Using the object form keys by a real MIME
 * (`application/octet-stream`, the generic binary type browsers
 * already report for `.sav`) and lists the extension as the value
 * — this is the canonical shape and silences the warning while
 * keeping extension-based matching.
 */
const SAVEGAME_ACCEPT = {
  'application/octet-stream': ['.sav'],
};

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
    const game = gameId ? state.games.games[gameId] : null;
    return {
      resourceFilters: mapState?.resourceFilters ?? EMPTY_RESOURCE_FILTERS,
      hideUsedNodes: mapState?.hideUsedNodes ?? false,
      usedNodesList: game?.usedNodes ?? EMPTY_USED_NODES,
      sumMode: state.mapSelection?.sumMode ?? false,
      collectibleVisibility:
        mapState?.collectibleVisibility ?? EMPTY_COLLECTIBLE_VISIBILITY,
      hideCollectedCollectibles: mapState?.hideCollectedCollectibles ?? false,
      collectedList: game?.collectedItems ?? EMPTY_COLLECTED_LIST,
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

  const { importing, progress, importFile } = useSavegameImport();

  const handleDroppedSavegame = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!gameId) {
      notifications.show({
        title: 'No game selected',
        message: 'Create or select a game before importing a save.',
        color: 'yellow',
      });
      return;
    }
    importFile(file)
      .then(save => {
        useStore.getState().setGameUsedNodes(gameId, save.usedNodeIds);
        const count = save.usedNodeIds.length;
        notifications.show({
          title: 'Used nodes imported',
          message:
            count === 0
              ? 'No miners found in the save. Cleared used marks.'
              : `Marked ${count} node${count === 1 ? '' : 's'} as used from the save.`,
          color: 'green',
        });
      })
      .catch(err => {
        console.error('Error while parsing savegame:', err?.message ?? err);
        notifications.show({
          title: 'Error while parsing savegame',
          message: err?.message ?? 'Unknown parser error',
          color: 'red',
        });
      });
  };

  const handleRejectedSavegame = () => {
    notifications.show({
      title: 'Unsupported file',
      message: 'Drop a single Satisfactory .sav save file to import it.',
      color: 'red',
    });
  };

  return (
    <Dropzone
      onDrop={handleDroppedSavegame}
      onReject={handleRejectedSavegame}
      accept={SAVEGAME_ACCEPT}
      multiple={false}
      // Clicks on the map must keep working (marker popups, pan, etc),
      // so the dropzone only reacts to drag-and-drop, never opens the
      // native file picker. Users who prefer a button still have the
      // "Import from save" button in the left filter panel.
      activateOnClick={false}
      activateOnKeyboard={false}
      // Mantine's `inner` wrapper defaults to `pointer-events: none`,
      // which would swallow Leaflet's pan / scroll-zoom / marker
      // click handlers. Re-enable pointer events so the underlying
      // map keeps full interactivity; the dropzone still picks up
      // the `dragenter`/`drop` events because react-dropzone binds
      // them on the root, not on the inner.
      enablePointerEvents
      disabled={importing}
      loading={importing}
      // Mantine's default Dropzone root paints a dashed border,
      // md padding, and a dark-6 background. We want the drop target
      // to be invisible chrome around the existing mapShell (which
      // has its own rounded corners / clipping / background), so
      // `dropzoneRoot` zeroes out all of that while keeping the
      // Dropzone semantics. The `inner` slot is Mantine's internal
      // wrapper around children; by default it has no height, which
      // would collapse `.mapShell`'s `height: 100%` to 0 — the
      // `dropzoneInner` class propagates the 100% height through.
      classNames={{
        root: classes.dropzoneRoot,
        inner: classes.dropzoneInner,
      }}
      data-tutorial-id="map-canvas"
    >
      <div className={classes.mapShell}>
        <MapContainer
          crs={L.CRS.Simple}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={EFFECTIVE_MAX_ZOOM}
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
            maxNativeZoom={MAX_ZOOM}
            detectRetina
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
        <Dropzone.Accept>
          <div className={classes.dropOverlay}>
            <Text size="lg" fw={700}>
              Drop save to import used nodes
            </Text>
          </div>
        </Dropzone.Accept>
        <Dropzone.Reject>
          <div
            className={`${classes.dropOverlay} ${classes.dropOverlayReject}`}
          >
            <Text size="lg" fw={700}>
              Only .sav files are supported
            </Text>
          </div>
        </Dropzone.Reject>
      </div>
      {/*
        Sibling of `mapShell` (and of Mantine's internal LoadingOverlay)
        rather than a child, so it shares the dropzone root's stacking
        context. `mapShell` uses `isolation: isolate` which would trap
        children inside its own stacking context — at that point
        `z-index` could not lift this banner above the LoadingOverlay
        backdrop (default `z-index: 400`). Rendered here with
        `z-index: 401` it paints just above the backdrop while the
        Mantine spinner sits next to it.
      */}
      {importing ? (
        <div className={classes.importProgress}>
          <Text size="xs" fw={600} mb={4}>
            {progress.message ?? 'Parsing savegame…'}
          </Text>
          <Progress color="orange" value={progress.value * 100} animated />
        </div>
      ) : null}
    </Dropzone>
  );
}
