import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useStore } from '@/core/zustand';
import { gameToLatLng } from './coords';

const PLAYER_ICON_HTML = `
  <div class="map-player-marker">
    <span class="map-player-marker__pulse" aria-hidden="true"></span>
    <span class="map-player-marker__core" aria-hidden="true"></span>
  </div>
`;

const PLAYER_ICON: L.DivIcon = L.divIcon({
  html: PLAYER_ICON_HTML,
  className: 'map-player-marker-wrapper',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * Renders one Leaflet marker per `Char_Player_C` actor extracted from
 * the most recent savegame import. The marker is a violet pulsing dot
 * to make the player position stand out against the resource and
 * collectible pins. Hidden when the loaded payload belongs to a
 * different game than the active selection (mirrors the gating used by
 * the infrastructure canvas).
 */
export function PlayerMarkerLayer() {
  const map = useMap();
  const players = useStore(s => s.mapInfrastructure.players);
  const ownerGameId = useStore(s => s.mapInfrastructure.gameId);
  const selectedGameId = useStore(s => s.games.selected);

  const isActive =
    players.length > 0 && ownerGameId != null && ownerGameId === selectedGameId;

  useEffect(() => {
    if (!isActive) return;
    const layer = L.layerGroup();
    for (const p of players) {
      const marker = L.marker(gameToLatLng(p.x, p.y), {
        icon: PLAYER_ICON,
        // Keep the player marker above resource / collectible pins.
        zIndexOffset: 1000,
        title: 'Player',
        interactive: false,
        keyboard: false,
      });
      layer.addLayer(marker);
    }
    layer.addTo(map);
    return () => {
      layer.removeFrom(map);
    };
  }, [map, players, isActive]);

  return null;
}
