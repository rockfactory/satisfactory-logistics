import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useStore } from '@/core/zustand';
import type { CollectibleType } from '@/recipes/WorldCollectibles';
import type { Purity } from '@/recipes/WorldResourceNodes';
import {
  decodeShareUrl,
  encodeShareUrl,
  type ShareableMapState,
  shareUrlsEqual,
} from './shareUrlState';

/**
 * Live-syncs the map's view + filter state with `location.hash`.
 *
 * - On first mount, parses the incoming hash (if any) and writes
 *   that snapshot into the zustand store + Leaflet viewport. This
 *   lets a shared link override the recipient's persisted state.
 * - After mount, watches the store and the Leaflet map and writes
 *   the current state back to the hash on a short debounce, using
 *   `history.replaceState` so the browser's back/forward stack
 *   doesn't fill up with one entry per pan tick.
 *
 * Intentionally lives as a child of `<MapContainer>` so it can use
 * `useMap()` — `MapContainer` itself can't read its own viewport
 * imperatively from outside.
 */
export function ShareUrlSync() {
  const map = useMap();

  /** True until we've finished the one-shot URL→state apply. */
  const initialApplyDoneRef = useRef(false);
  /** Last hash we wrote, so we can ignore the resulting hashchange. */
  const lastWrittenHashRef = useRef<string | null>(null);

  // ---------------------------------------------------------------
  // 1) On mount, hydrate from the URL hash (if it looks like ours)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!initialApplyDoneRef.current) {
      const incoming = decodeShareUrl(window.location.hash);
      if (incoming) {
        applyToStore(incoming);
        applyToMap(map, incoming);
      }
      initialApplyDoneRef.current = true;
    }
    // Also listen for back/forward navigation so the map updates
    // when the user moves through history. Same parser, no
    // re-application of unrelated hashes.
    const onPopState = () => {
      const next = decodeShareUrl(window.location.hash);
      if (!next) return;
      applyToStore(next);
      applyToMap(map, next);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [map]);

  // ---------------------------------------------------------------
  // 2) After mount, write store + viewport changes back to the URL
  // ---------------------------------------------------------------
  useEffect(() => {
    let timer: number | null = null;

    /**
     * Recomputes the share URL from the current store + viewport
     * and writes it via `replaceState`. Skips the initial mount
     * (the hydrator above already settled state) and skips writes
     * that wouldn't change the encoded hash, so a slow pan that
     * fires `move` 60 times a second only rewrites once after it
     * settles.
     */
    const sync = () => {
      if (!initialApplyDoneRef.current) return;
      const state = readStateFromStoreAndMap(map);
      if (!state) return;
      const params = encodeShareUrl(state);
      const nextHash = `#${params.toString()}`;
      if (lastWrittenHashRef.current === nextHash) return;
      // Only bypass the equality check when the parsed forms match;
      // covers the edge case where another writer rewrote the hash
      // without going through this hook.
      const currentParsed = new URLSearchParams(
        window.location.hash.replace(/^#/, ''),
      );
      if (shareUrlsEqual(currentParsed, params)) {
        lastWrittenHashRef.current = nextHash;
        return;
      }
      lastWrittenHashRef.current = nextHash;
      const url = `${window.location.pathname}${window.location.search}${nextHash}`;
      window.history.replaceState(window.history.state, '', url);
    };

    /** Debounced wrapper. 250ms feels live without thrashing. */
    const scheduleSync = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(sync, 250);
    };

    // Map viewport changes — `moveend` covers both pan and zoom on
    // commit; we deliberately don't use `move` to avoid spam.
    map.on('moveend', scheduleSync);
    map.on('zoomend', scheduleSync);

    // Store changes — subscribe to the entire `map` slice and the
    // viewport-irrelevant fields are filtered out by the encoder.
    const unsub = useStore.subscribe(scheduleSync);

    // Trigger one initial sync so a fresh visit (no hash) gets a
    // shareable URL right away.
    scheduleSync();

    return () => {
      if (timer != null) window.clearTimeout(timer);
      map.off('moveend', scheduleSync);
      map.off('zoomend', scheduleSync);
      unsub();
    };
  }, [map]);

  return null;
}

/**
 * Pulls the current shareable state out of the zustand store +
 * Leaflet map. Returns `null` when the store hasn't rehydrated yet
 * (the slice can be undefined for a frame after first paint).
 */
function readStateFromStoreAndMap(map: L.Map): ShareableMapState | null {
  const state = useStore.getState();
  const mapSlice = state.map;
  if (!mapSlice) return null;
  const center = map.getCenter();
  return {
    zoom: map.getZoom(),
    center: [center.lat, center.lng],
    resourceFilters: mapSlice.resourceFilters,
    collectibleVisibility: mapSlice.collectibleVisibility,
    hideUsedNodes: mapSlice.hideUsedNodes,
    hideCollectedCollectibles: mapSlice.hideCollectedCollectibles,
  };
}

/**
 * Applies the decoded URL state to the zustand store. Each field
 * is independently optional — the URL might omit `cv` if the link
 * was created on a build that didn't have collectibles yet, and
 * we want that to leave the recipient's collectible visibility
 * alone instead of force-hiding everything.
 */
function applyToStore(state: Partial<ShareableMapState>): void {
  const store = useStore.getState();
  if (state.resourceFilters) {
    store.setResourceFilters(state.resourceFilters as Record<string, Purity[]>);
  }
  if (state.collectibleVisibility) {
    store.setCollectibleVisibility(
      state.collectibleVisibility as Record<CollectibleType, boolean>,
    );
  }
  if (typeof state.hideUsedNodes === 'boolean') {
    store.setHideUsedNodes(state.hideUsedNodes);
  }
  if (typeof state.hideCollectedCollectibles === 'boolean') {
    store.setHideCollectedCollectibles(state.hideCollectedCollectibles);
  }
}

/**
 * Drives the Leaflet viewport from a decoded URL state. Uses
 * `setView` (no animation) since this only fires on initial load
 * or back/forward navigation; `flyTo` would feel sluggish in those
 * contexts.
 */
function applyToMap(map: L.Map, state: Partial<ShareableMapState>): void {
  if (state.center && typeof state.zoom === 'number') {
    map.setView(state.center, state.zoom, { animate: false });
  } else if (state.center) {
    map.setView(state.center, map.getZoom(), { animate: false });
  } else if (typeof state.zoom === 'number') {
    map.setZoom(state.zoom, { animate: false });
  }
}
