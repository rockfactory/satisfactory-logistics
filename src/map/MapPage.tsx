import { useStore } from '@/core/zustand';
import { FullHeightContainer } from '@/layout/FullHeightContainer';
import { MapFiltersPanel } from './MapFiltersPanel';
import classes from './MapPage.module.css';
import { WorldMapView } from './WorldMapView';

export function MapPage() {
  const gameId = useStore(state => state.games.selected ?? null);

  return (
    <FullHeightContainer>
      <div className={classes.layout}>
        <MapFiltersPanel gameId={gameId} />
        <div className={classes.mapArea}>
          <WorldMapView gameId={gameId} />
        </div>
      </div>
    </FullHeightContainer>
  );
}
