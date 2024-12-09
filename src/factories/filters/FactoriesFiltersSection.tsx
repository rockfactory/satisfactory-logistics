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
import { useStore } from '@/core/zustand';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { FactoryItemInput } from '@/factories/inputs/FactoryItemInput';
import { FactoryViewSlice } from '@/factories/store/factoryViewSlice';
import { v4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

export interface IFactoriesFiltersSectionProps {}

export function FactoriesFiltersSection(_props: IFactoriesFiltersSectionProps) {
  const factoryView = useStore(state => state.factoryView);
  const updateFactoryView = useStore(state => state.updateFactoryView);
  const navigate = useNavigate();

  return (
    <Group justify="space-between">
      <Group>
        <SegmentedControl
          data={[
            {
              label: 'Grid',
              value: 'grid',
            },
            {
              label: 'Kanban',
              value: 'kanban',
            },
            {
              label: 'Spreadsheet',
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
        <GameSettingsModal />
        {/* <FactoryUndoButtons /> */}
        <Button
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
