import {
  Button,
  Group,
  Menu,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import {
  IconChevronDown,
  IconPlus,
  IconSearch,
  IconTextGrammar,
} from '@tabler/icons-react';
import { useStore } from '../../core/zustand';
import { FactoryItemInput } from '../inputs/FactoryItemInput';
import { FactoriesSettings } from '../settings/FactoriesSettings';

export interface IFactoriesFiltersSectionProps {}

export function FactoriesFiltersSection(_props: IFactoriesFiltersSectionProps) {
  const factoryView = useStore(state => state.factoryView);
  const updateFactoryView = useStore(state => state.updateFactoryView);

  return (
    <Group justify="space-between">
      <Group>
        <TextInput
          placeholder="Filter by name"
          rightSection={<IconSearch size={16} />}
          value={factoryView.filterName ?? ''}
          onChange={e =>
            updateFactoryView(state => {
              state.filterName = e.currentTarget.value;
            })
          }
        />
        <FactoryItemInput
          size="sm"
          placeholder="Filter by resource..."
          value={factoryView?.filterResource ?? ''}
          clearable
          onChange={resource =>
            updateFactoryView(state => {
              state.filterResource = resource;
            })
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
                updateFactoryView(state => {
                  state.sortBy = 'name';
                });
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
          value={factoryView?.viewMode ?? 'wide'}
          onChange={value =>
            updateFactoryView(state => {
              state.viewMode = value as 'compact' | 'wide';
            })
          }
        />
      </Group>
      <Group>
        <FactoriesSettings />
        {/* <FactoryUndoButtons /> */}
        <Button
          onClick={e => useStore.getState().addGameFactory()}
          leftSection={<IconPlus size={16} />}
        >
          Add Factory
        </Button>
      </Group>
    </Group>
  );
}
