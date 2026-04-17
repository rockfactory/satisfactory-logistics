import {
  Button,
  Center,
  Group,
  Menu,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import {
  IconChevronDown,
  IconLayoutGrid,
  IconLayoutKanban,
  IconPlus,
  IconSearch,
  IconTable,
  IconTextGrammar,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import { FactoryItemInput } from '@/factories/inputs/FactoryItemInput';
import type { FactoryViewSlice } from '@/factories/store/factoryViewSlice';

export interface IFactoriesFiltersSectionProps {}

export function FactoriesFiltersSection(_props: IFactoriesFiltersSectionProps) {
  const factoryView = useStore(state => state.factoryView);
  const updateFactoryView = useStore(state => state.updateFactoryView);
  const navigate = useNavigate();

  return (
    <Group justify="space-between">
      <Group>
        <SegmentedControl
          data-tutorial-id="view-switcher"
          radius="md"
          data={[
            {
              label: (
                <Center style={{ gap: 6 }}>
                  <IconLayoutGrid size={16} />
                  <span>Grid</span>
                </Center>
              ),
              value: 'grid',
            },
            {
              label: (
                <Center style={{ gap: 6 }}>
                  <IconLayoutKanban size={16} />
                  <span>Kanban</span>
                </Center>
              ),
              value: 'kanban',
            },
            {
              label: (
                <Center style={{ gap: 6 }}>
                  <IconTable size={16} />
                  <span>Spreadsheet</span>
                </Center>
              ),
              value: 'spreadsheet',
            },
          ]}
          value={factoryView?.viewMode ?? 'grid'}
          onChange={value =>
            updateFactoryView(state => {
              state.viewMode = value as FactoryViewSlice['viewMode'];
            })
          }
        />

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
                useStore.getState().sortFactoriesBy('name');
              }}
            >
              By Name
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Group>
        {/* <FactoryUndoButtons /> */}
        <Button
          data-tutorial-id="add-factory-btn"
          onClick={e => {
            const factoryId = v4();

            useStore.getState().addGameFactory(factoryId);

            navigate(factoryId);
          }}
          leftSection={<IconPlus size={16} />}
        >
          Add Factory
        </Button>
      </Group>
    </Group>
  );
}
