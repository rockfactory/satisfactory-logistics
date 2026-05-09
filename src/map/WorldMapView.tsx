import { Progress, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useShallowStore } from '@/core/zustand';
import { useNodeAssignments } from '@/factories/store/factoryNodeAssignmentsSelectors';
import { useSavegameImport } from '@/recipes/savegame/useSavegameImport';
import {
  COLLECTIBLE_TYPES,
  type CollectibleType,
  getWorldCollectibles,
} from '@/recipes/WorldCollectibles';
import type { WorldResourceNode } from '@/recipes/WorldResourceNodes';
import {
  getWorldResourceNodes,
  type Purity,
} from '@/recipes/WorldResourceNodes';
import { AssignNodesToInputModal } from './AssignNodesToInputModal';
import { CollectibleMarkersLayer } from './CollectibleMarkersLayer';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  IMAGE_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
} from './coords';
import { InfrastructureCanvasLayer } from './infrastructure/InfrastructureCanvasLayer';
import { MapSelectionSummary } from './MapSelectionSummary';
import { PlayerMarkerLayer } from './PlayerMarkerLayer';
import { ResourceMarkersLayer } from './ResourceMarkersLayer';
import { ShareUrlSync } from './ShareUrlSync';
import classes from './WorldMapView.module.css';

const DEFAULT_TILES_BASE_URL =
  'https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v2';

/**
 * Deepest displayed zoom that still maps 1:1 to a real tile in the
 * pyramid. `detectRetina` on the TileLayer bumps zoomOffset by 1 (it
 * pulls tiles from one pyramid level above the displayed zoom) and
 * decrements its own internal maxZoom by 1, so on retina the highest
 * URL-backed displayed zoom is `MAX_ZOOM - 1` rather than `MAX_ZOOM`.
 */
const MAX_NATIVE_DISPLAYED_ZOOM = L.Browser.retina ? MAX_ZOOM - 1 : MAX_ZOOM;

/**
 * Extra zoom steps allowed past the native pyramid. Leaflet stretches
 * the deepest tiles via CSS for these levels (no extra tile fetches),
 * so two steps give ~4x more zoom for inspecting individual machines
 * and splines without the upscaled imagery turning into a blur.
 */
const OVERZOOM_LEVELS = 2;
const MAX_DISPLAYED_ZOOM = MAX_NATIVE_DISPLAYED_ZOOM + OVERZOOM_LEVELS;

/**
 * `detectRetina` decrements the TileLayer's own maxZoom by 1, and
 * GridLayer refuses to render any tile zoom strictly greater than that
 * effective maxZoom (the "grey screen" failure mode). Compensate by
 * passing a TileLayer maxZoom that is one above the map's maxZoom on
 * retina, so the post-detectRetina effective value lands on
 * `MAX_DISPLAYED_ZOOM`.
 */
const TILE_LAYER_MAX_ZOOM = L.Browser.retina
  ? MAX_DISPLAYED_ZOOM + 1
  : MAX_DISPLAYED_ZOOM;

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
    selectedNodeIdsList,
    collectibleVisibility,
    hideCollectedCollectibles,
    collectedList,
    savegameOverrides,
  } = useShallowStore(state => {
    const mapState = state.map;
    const game = gameId ? state.games.games[gameId] : null;
    return {
      resourceFilters: mapState?.resourceFilters ?? EMPTY_RESOURCE_FILTERS,
      hideUsedNodes: mapState?.hideUsedNodes ?? false,
      usedNodesList: game?.usedNodes ?? EMPTY_USED_NODES,
      sumMode: state.mapSelection?.sumMode ?? false,
      // Subscribed here so the filter memo invalidates when the user
      // navigates in from the input row's "View on map" button. The
      // selection seed has to bypass `hideUsedNodes` (assignment
      // automatically marks nodes as used, otherwise the markers
      // would arrive on a map that immediately hides them).
      selectedNodeIdsList:
        state.mapSelection?.selectedNodeIds ?? EMPTY_USED_NODES,
      collectibleVisibility:
        mapState?.collectibleVisibility ?? EMPTY_COLLECTIBLE_VISIBILITY,
      hideCollectedCollectibles: mapState?.hideCollectedCollectibles ?? false,
      collectedList: game?.collectedItems ?? EMPTY_COLLECTED_LIST,
      // Subscribed-to-but-unused: `getWorldResourceNodes` reads
      // overrides synchronously from the store, but we need this
      // selector so the `filteredNodes` memo invalidates when an
      // import lands.
      savegameOverrides: game?.savegameNodeOverrides,
    };
  });

  const usedNodes = useMemo(() => new Set(usedNodesList), [usedNodesList]);
  const collectedIds = useMemo(() => new Set(collectedList), [collectedList]);
  const selectedNodeIdsSet = useMemo(
    () => new Set(selectedNodeIdsList),
    [selectedNodeIdsList],
  );

  // ─── Node-to-factory assignments. The selector returns the
  //     full per-node ref array (already filtered for orphans and
  //     resource mismatches). The marker layer only needs two
  //     projections: a "is this node assigned?" Set for the icon
  //     badge, and a `nodeId -> "Factory A · Factory B"` map for
  //     the popup line.
  const nodeAssignments = useNodeAssignments(gameId ?? null);

  const assignedNodes = useMemo(
    () => new Set(Object.keys(nodeAssignments)),
    [nodeAssignments],
  );

  const assignmentLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const [nodeId, refs] of Object.entries(nodeAssignments)) {
      const names = refs.map(r => r.factoryName ?? 'Unnamed factory');
      map.set(nodeId, names.join(' · '));
    }
    return map;
  }, [nodeAssignments]);

  // ─── Assignment modal state. Owned here (not in the marker
  //     layer) so the same modal instance is reused regardless of
  //     entry point (popup action, sum-mode summary, or future
  //     callers), and so the modal renders inside the React tree
  //     instead of the imperative Leaflet layer.
  const [assignTarget, setAssignTarget] = useState<WorldResourceNode | null>(
    null,
  );
  const [assignModalOpened, assignModal] = useDisclosure(false);
  const handleAssignNodeRequest = useCallback(
    (node: WorldResourceNode) => {
      setAssignTarget(node);
      assignModal.open();
    },
    [assignModal],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: savegameOverrides is read indirectly via getWorldResourceNodes' useStore.getState() lookup; the dep is required to invalidate the memo on import.
  const filteredNodes = useMemo(() => {
    return getWorldResourceNodes(gameId).filter(node => {
      // Selection always wins. Reason: the user got here either via
      // "View on map" from a factory input row (we just programmatic-
      // ally selected the assigned nodes) or via an explicit click on
      // the marker. Either way, hiding the very thing they pointed
      // at would be hostile UX. This also covers the assignment side-
      // effect: assigning a node marks it as used, so without this
      // override the freshly-assigned nodes would vanish under
      // `hideUsedNodes`.
      if (selectedNodeIdsSet.has(node.id)) return true;
      if (!resourceFilters[node.resource]?.includes(node.purity)) return false;
      if (hideUsedNodes && usedNodes.has(node.id)) return false;
      return true;
    });
  }, [
    gameId,
    resourceFilters,
    hideUsedNodes,
    usedNodes,
    selectedNodeIdsSet,
    savegameOverrides,
  ]);

  const filteredCollectibles = useMemo(() => {
    return getWorldCollectibles().filter(collectible => {
      if (!collectibleVisibility[collectible.type]) return false;
      if (hideCollectedCollectibles && collectedIds.has(collectible.id))
        return false;
      return true;
    });
  }, [collectibleVisibility, hideCollectedCollectibles, collectedIds]);

  const { importing, progress, importAndApplyToGame } = useSavegameImport();

  const handleDroppedSavegame = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    importAndApplyToGame(file, gameId, {
      defaultRecipes: true,
      usedNodes: true,
      infrastructure: true,
    }).catch(() => {
      // Notification surfaced by the hook; nothing else to do here.
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
          maxZoom={MAX_DISPLAYED_ZOOM}
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
            maxZoom={TILE_LAYER_MAX_ZOOM}
            maxNativeZoom={MAX_NATIVE_DISPLAYED_ZOOM}
            detectRetina
          />
          <MarkerZoomScaleController />
          <InfrastructureCanvasLayer />
          <ResourceMarkersLayer
            nodes={filteredNodes}
            usedNodes={usedNodes}
            gameId={gameId ?? null}
            sumMode={sumMode}
            assignedNodes={assignedNodes}
            assignmentLabels={assignmentLabels}
            onAssignNodeRequest={handleAssignNodeRequest}
          />
          <CollectibleMarkersLayer
            collectibles={filteredCollectibles}
            collectedIds={collectedIds}
            gameId={gameId ?? null}
          />
          <PlayerMarkerLayer />
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
              Drop save to import recipes, used nodes, and built infrastructure
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
      <AssignNodesToInputModal
        opened={assignModalOpened}
        onClose={() => {
          assignModal.close();
          setAssignTarget(null);
        }}
        gameId={gameId ?? null}
        nodeIds={assignTarget ? [assignTarget.id] : []}
        resource={assignTarget?.resource ?? null}
      />
    </Dropzone>
  );
}
