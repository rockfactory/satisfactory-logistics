import {
  Button,
  Group,
  Menu,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import {
  IconChevronDown,
  IconSearch,
  IconTextGrammar,
} from '@tabler/icons-react';
import { useDispatch, useSelector } from 'react-redux';
import { SyncButton } from '../../auth/sync/SyncButton';
import { RootState } from '../../core/store';
import { FactoryItemInput } from '../inputs/FactoryItemInput';
import { factoryActions } from '../store/FactoriesSlice';

export interface IFactoriesFiltersSectionProps {}

export function FactoriesFiltersSection(_props: IFactoriesFiltersSectionProps) {
  const dispatch = useDispatch();
  const filters = useSelector(
    (state: RootState) => state.factories.present.filters,
  );

  return (
    <Group justify="space-between">
      <Group>
        <TextInput
          placeholder="Filter by name"
          rightSection={<IconSearch size={16} />}
          value={filters?.name ?? ''}
          onChange={e =>
            dispatch(
              factoryActions.setFilter({
                name: 'name',
                value: e.currentTarget.value,
              }),
            )
          }
        />
        <FactoryItemInput
          size="sm"
          placeholder="Filter by resource..."
          value={filters?.resource ?? ''}
          onChange={resource =>
            dispatch(
              factoryActions.setFilter({
                name: 'resource',
                value: resource,
              }),
            )
          }
        />
        <Menu shadow="md" width={120}>
          <Menu.Target>
            <Button
              variant="default"
              rightSection={
                <IconChevronDown color="white" width={16} height={16} />
              }
            >
              Sort
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconTextGrammar width={16} height={16} />}
              onClick={_e => {
                dispatch(factoryActions.sort({ by: 'name' }));
              }}
            >
              By Name
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <SegmentedControl
          data={[
            {
              label: 'Compact',
              value: 'compact',
            },
            {
              label: 'Wide',
              value: 'wide',
            },
          ]}
          value={filters?.viewMode ?? 'wide'}
          onChange={value =>
            dispatch(
              factoryActions.setFilter({
                name: 'viewMode',
                value,
              }),
            )
          }
        />
      </Group>
      <Group>
        <SyncButton />
        <Button onClick={() => dispatch(factoryActions.add({}))}>
          Add Factory
        </Button>
      </Group>
    </Group>
  );
}
