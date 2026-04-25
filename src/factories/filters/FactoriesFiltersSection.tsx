import {
  Button,
  Center,
  FileButton,
  Group,
  Menu,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import {
  IconChevronDown,
  IconClipboard,
  IconLayoutGrid,
  IconLayoutKanban,
  IconPlus,
  IconSearch,
  IconTable,
  IconTextGrammar,
  IconUpload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import { useImportFactory } from '@/factories/import/useImportFactory';
import { FactoryItemInput } from '@/factories/inputs/FactoryItemInput';
import type { FactoryViewSlice } from '@/factories/store/factoryViewSlice';

export interface IFactoriesFiltersSectionProps {}

export function FactoriesFiltersSection(_props: IFactoriesFiltersSectionProps) {
  const factoryView = useStore(state => state.factoryView);
  const updateFactoryView = useStore(state => state.updateFactoryView);
  const navigate = useNavigate();
  const { importFromFile, importFromClipboard } = useImportFactory();

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
          width={220}
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
        <Button.Group>
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
          <Menu shadow="md" width={220} position="bottom-end" withinPortal>
            <Menu.Target>
              <Button
                data-tutorial-id="import-factory-btn"
                px="xs"
                aria-label="Import factory"
              >
                <IconChevronDown size={16} />
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <FileButton
                onChange={file => {
                  importFromFile(file).catch(console.error);
                }}
                accept="application/json"
              >
                {fileProps => (
                  <Menu.Item
                    leftSection={<IconUpload size={16} stroke={1.5} />}
                    onClick={fileProps.onClick}
                  >
                    Import from file...
                  </Menu.Item>
                )}
              </FileButton>
              <Menu.Item
                leftSection={<IconClipboard size={16} stroke={1.5} />}
                onClick={() => {
                  importFromClipboard().catch(console.error);
                }}
              >
                Paste from clipboard
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Button.Group>
      </Group>
    </Group>
  );
}
