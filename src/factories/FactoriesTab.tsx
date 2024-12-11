import {
  Container,
  Divider,
  Group,
  SimpleGrid,
  Space,
  Stack,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { useSession } from '@/auth/authSelectors';
// import { loadFromRemote } from '../auth/sync/loadFromRemote';
import { useNavigate } from 'react-router-dom';
import { useStore, useUiStore } from '@/core/zustand';
import { useGameFactoriesIds } from '@/games/gamesSlice';
import { FactoryGridCard } from './list/FactoryGridCard';
import { FactoriesFiltersMenu } from './filters/FactoriesFiltersMenu';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { FactoriesKanban } from '@/factories/list/FactoriesKanban';
import { FactoryRow } from '@/factories/list/FactoryRow';
import { FactoriesEmptyState } from '@/factories/list/FactoriesEmptyState';
import { sortBy } from 'lodash';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible';
import { FactoriesListSortBy } from '@/factories/FactoriesListSortBy';
import { FactoriesListHeader } from '@/factories/FactoriesListHeader';
import { GameFactoriesExpandActionIcon } from '@/factories/components/expand/GameFactoriesExpandActionIcon';

export interface IFactoriesTabProps {}

export function FactoriesTab(_props: IFactoriesTabProps) {
  const session = useSession();
  const navigate = useNavigate();

  const gameId = useStore(state => state.games.selected);
  const viewMode = useUiStore(state => state.factoryView.viewMode ?? 'grid');
  const viewSortBy = useUiStore(state => state.factoryView.sortBy);

  const [loadingFactories, setLoadingFactories] = useState(false);
  const hasFactories = useStore(
    state =>
      Object.keys(state.games.games).length > 0 &&
      state.games.selected &&
      state.games.games[state.games.selected]?.factoriesIds.length > 0,
  );
  const factoriesIds = useGameFactoriesIds(gameId);
  const factories = useGameFactories(gameId);
  const isFactoryVisible = useIsFactoryVisible(true);

  const factoryList = useMemo(
    () =>
      (typeof viewSortBy === 'string'
        ? sortBy(factories, [viewSortBy])
        : factories
      ).filter(({ id }) => isFactoryVisible(id)),
    [factories, viewSortBy, isFactoryVisible],
  );

  return (
    <div>
      <FactoriesFiltersMenu />

      <Container size="lg" mt="lg">
        {!hasFactories && <FactoriesEmptyState />}
        {viewMode === 'spreadsheet' && (
          <Stack gap="md">
            <FactoriesListHeader
              factoriesShown={factoryList.length}
              factoriesTotal={factories.length}
              rightSide={
                <Group>
                  <GameFactoriesExpandActionIcon />
                  <FactoriesListSortBy />
                </Group>
              }
            />
            {factoryList.map(({ id }, index) => (
              <FactoryRow key={id} id={id} index={index} />
            ))}
          </Stack>
        )}
        {viewMode === 'grid' && (
          <Stack gap="md">
            <FactoriesListHeader
              factoriesShown={factoryList.length}
              factoriesTotal={factories.length}
              rightSide={<FactoriesListSortBy />}
            />

            <SimpleGrid spacing="lg" cols={3}>
              {factoryList.map(({ id }, index) => (
                <FactoryGridCard key={id} id={id} />
              ))}
            </SimpleGrid>
          </Stack>
        )}
        {!hasFactories && <Divider mb="lg" />}
      </Container>

      {viewMode === 'kanban' && (
        <Stack gap="md">
          <Container size="lg" w="100%">
            <FactoriesListHeader
              factoriesShown={factoryList.length}
              factoriesTotal={factories.length}
              rightSide={<div></div>}
            />
          </Container>{' '}
          <FactoriesKanban
            factories={factoryList}
            disableCardDrag={factoryList.length !== factories.length}
          />
        </Stack>
      )}
      <Space h={100} />
    </div>
  );
}
