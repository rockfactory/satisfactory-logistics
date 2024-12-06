import { Container, Divider, SimpleGrid, Space, Stack } from '@mantine/core';
import { useState } from 'react';
import { useSession } from '@/auth/authSelectors';
// import { loadFromRemote } from '../auth/sync/loadFromRemote';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { useGameFactoriesIds } from '@/games/gamesSlice';
import { FactoryGridCard } from './list/FactoryGridCard.tsx';
import { FactoriesFiltersMenu } from './filters/FactoriesFiltersMenu';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors.ts';
import { FactoriesKanban } from '@/factories/list/FactoriesKanban.tsx';
import { FactoryRow } from '@/factories/list/FactoryRow.tsx';
import { FactoriesEmptyState } from '@/factories/list/FactoriesEmptyState.tsx';

export interface IFactoriesTabProps {}

export function FactoriesTab(_props: IFactoriesTabProps) {
  const session = useSession();
  const navigate = useNavigate();

  const gameId = useStore(state => state.games.selected);
  const viewMode = useStore(state => state.factoryView.viewMode ?? 'grid');

  const [loadingFactories, setLoadingFactories] = useState(false);

  const hasFactories = useStore(
    state =>
      Object.keys(state.games.games).length > 0 &&
      state.games.selected &&
      state.games.games[state.games.selected]?.factoriesIds.length > 0,
  );
  const factoriesIds = useGameFactoriesIds(gameId);
  const factories = useGameFactories(gameId);

  return (
    <div>
      <FactoriesFiltersMenu />

      <Container size="lg" mt="lg">
        {!hasFactories && <FactoriesEmptyState />}
        {viewMode === 'spreadsheet' && (
          <Stack gap="md">
            {factoriesIds.map((factoryId, index) => (
              <FactoryRow key={factoryId} id={factoryId} index={index} />
            ))}
          </Stack>
        )}
        {viewMode === 'grid' && (
          <SimpleGrid spacing="lg" cols={3}>
            {factoriesIds.map((factoryId, index) => (
              <FactoryGridCard key={factoryId} id={factoryId} />
            ))}
          </SimpleGrid>
        )}
        {!hasFactories && <Divider mb="lg" />}
      </Container>

      {viewMode === 'kanban' && <FactoriesKanban />}
      <Space h={100} />
    </div>
  );
}
