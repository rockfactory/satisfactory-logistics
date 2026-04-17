import { Group, Title } from '@mantine/core';
import { IconMap2 } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { FullHeightContainer } from '@/layout/FullHeightContainer';
import { MapFiltersPanel } from './MapFiltersPanel';
import classes from './MapPage.module.css';
import { WorldMapView } from './WorldMapView';

export function MapPage() {
  const gameId = useStore(state => state.games.selected ?? null);

  return (
    <>
      <AfterHeaderSticky>
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <IconMap2 size={20} />
            <Title order={4}>World Map</Title>
          </Group>
        </Group>
      </AfterHeaderSticky>
      <FullHeightContainer>
        <div className={classes.layout}>
          <MapFiltersPanel gameId={gameId} />
          <div className={classes.mapArea}>
            <WorldMapView gameId={gameId} />
          </div>
        </div>
      </FullHeightContainer>
    </>
  );
}
