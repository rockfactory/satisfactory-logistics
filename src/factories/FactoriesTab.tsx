import {
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Space,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingFactory,
  IconDownload,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSession } from '../auth/AuthSlice';
import { loadFromRemote } from '../auth/sync/loadFromRemote';
import { SyncButton } from '../auth/sync/SyncButton';
import { RootState } from '../core/store';
import { FactoryRow } from './FactoryRow';
import { FactoriesFiltersMenu } from './filters/FactoriesFiltersMenu';
import { ImportFactoriesModal } from './import/ImportFactoriesModal';
import { FactoriesSettings } from './settings/FactoriesSettings';
import { factoryActions, useFactories } from './store/FactoriesSlice';
import { FactoryUndoButtons } from './store/FactoryUndoButtons';
import { FactoryWideCard } from './wide/FactoryWideCard';

export interface IFactoriesTabProps {}

export function FactoriesTab(_props: IFactoriesTabProps) {
  const dispatch = useDispatch();
  const factories = useFactories();
  const session = useSession();
  const viewMode = useSelector(
    (state: RootState) => state.factories.present.filters?.viewMode ?? 'wide',
  );

  const [loadingFactories, setLoadingFactories] = useState(false);

  const hasFactories = useSelector(
    (state: RootState) => state.factories.present.factories.length > 0,
  );

  return (
    <div>
      <FactoriesFiltersMenu />

      <Container size="lg" mt="lg">
        {!hasFactories && (
          <Stack gap="xs" align="center" mih={200} mt={60} mb={90}>
            <IconBuildingFactory size={64} stroke={1.2} />
            <Text fz="h2">Let's build some factories!</Text>
            <Text size="sm" c="dark.2">
              Add factories to start planning your logistics.
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              mt="lg"
              size="lg"
              onClick={() => dispatch(factoryActions.add({}))}
            >
              Add first factory
            </Button>
            {session && (
              <>
                <Divider
                  w="60%"
                  mt="lg"
                  mb="lg"
                  label="Or, if you saved on another device"
                />
                <Button
                  size="lg"
                  leftSection={
                    loadingFactories ? (
                      <Loader size={16} />
                    ) : (
                      <IconDownload size={16} />
                    )
                  }
                  onClick={async () => {
                    setLoadingFactories(true);
                    await loadFromRemote(session, true);
                    setLoadingFactories(false);
                  }}
                >
                  Load saved factories
                </Button>
              </>
            )}
          </Stack>
        )}
        <Stack gap="md">
          {viewMode === 'wide' &&
            factories.map((factory, index) => (
              <FactoryWideCard
                key={factory.id}
                factory={factory}
                index={index}
              />
            ))}
          {viewMode === 'compact' &&
            factories.map((factory, index) => (
              <FactoryRow key={factory.id} factory={factory} index={index} />
            ))}
        </Stack>
        <Divider mb="lg" />
        {/* <FactoryItemInput /> */}
        <Group mt="lg" justify="space-between">
          <Group>
            <Button
              onClick={() => dispatch(factoryActions.add({}))}
              leftSection={<IconPlus size={16} />}
            >
              Add Factory
            </Button>
            <FactoryUndoButtons />
          </Group>
          <Group>
            <SyncButton />
            <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              variant="light"
              onClick={() => {
                dispatch(factoryActions.clear());
                notifications.show({
                  title: 'Factories cleared',
                  message:
                    'All factories have been removed. You can undo this action with Ctrl+Z or using the undo/redo buttons in the command bar.',
                  color: 'blue',
                });
              }}
            >
              Clear All
            </Button>
            <ImportFactoriesModal />
            <FactoriesSettings />
          </Group>
        </Group>
      </Container>
      <Space h={100} />
    </div>
  );
}
