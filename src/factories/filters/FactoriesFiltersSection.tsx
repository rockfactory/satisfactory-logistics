import {
  Box,
  Button,
  Combobox,
  Group,
  Menu,
  SegmentedControl,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import {
  IconChevronDown,
  IconLetterCase,
  IconPlus,
  IconSearch,
  IconTextGrammar,
} from '@tabler/icons-react';
import { useStore, useUiStore } from '@/core/zustand';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { FactoryItemInput } from '@/factories/inputs/FactoryItemInput';
import { FactoryViewSlice } from '@/factories/store/factoryViewSlice';
import { v4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  AllFactoryItemsMap,
  AllProducibleFactoryItems,
} from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import Fuse from 'fuse.js';
import ClearButton = Combobox.ClearButton;

const itemsFuse = new Fuse(AllProducibleFactoryItems, {
  keys: ['displayName', 'name', 'id'],
});

export interface IFactoriesFiltersSectionProps {}

type FilterValue = { name: string } | { resource: string } | null;

const ITEM_PREFIX = '__ITEM__NAME%%';

const useFilter = () => {
  const { filterName, filterResource } = useUiStore(el => el.factoryView);
  const value: FilterValue = filterName
    ? { name: filterName }
    : filterResource
      ? { resource: filterResource }
      : null;

  const setFilterResource = (resource: string) => {
    useUiStore.getState().updateFactoryView(view => {
      view.filterName = null;
      view.filterResource = resource;
    });
  };

  const setFilterName = (name: string) => {
    useUiStore.getState().updateFactoryView(view => {
      view.filterName = name;
      view.filterResource = null;
    });
  };

  const clearFilter = () => {
    useUiStore.getState().updateFactoryView(view => {
      view.filterName = null;
      view.filterResource = null;
    });
  };

  return { value, setFilterResource, setFilterName, clearFilter };
};

const getItems = (
  value: null | { resource: string } | { name: string },
  search: string | undefined,
) => {
  const options = value
    ? [
        search ? (
          <Combobox.Group label={'By text'}>
            <Combobox.Option
              value={search}
              key={search}
              selected={'name' in value}
            >
              <Group gap="sm" wrap="nowrap">
                <IconLetterCase size={16} />
                <div>
                  <Text size="sm" truncate="end">
                    Name: {search}
                  </Text>
                </div>
              </Group>
            </Combobox.Option>
          </Combobox.Group>
        ) : null,
        <Combobox.Group label={'By resource'}>
          {itemsFuse
            .search(search ?? '')
            .slice(0, 10)
            .map(({ item }) => (
              <Combobox.Option
                value={ITEM_PREFIX + item.id}
                key={ITEM_PREFIX + item.id}
              >
                <Group gap="sm" wrap="nowrap">
                  <FactoryItemImage id={item?.id} size={16} />
                  <div>
                    <Text size="sm" truncate="end">
                      {item?.displayName ?? 'Unknown item'}
                    </Text>
                  </div>
                </Group>
              </Combobox.Option>
            ))}
        </Combobox.Group>,
      ]
    : [];
  return options;
};

const getSearch = (value: { name: string } | { resource: string } | null) => {
  if (!value) {
    return undefined;
  }

  if ('name' in value) {
    return value.name;
  }

  return AllFactoryItemsMap[value.resource].displayName;
};

const SearchFilter = () => {
  const combobox = useCombobox();
  const { value, setFilterResource, setFilterName, clearFilter } = useFilter();

  const search = getSearch(value);

  const options = getItems(value, search);

  return (
    <Box w={240}>
      <Combobox
        onOptionSubmit={optionValue => {
          if (optionValue.startsWith(ITEM_PREFIX)) {
            setFilterResource(optionValue.substring(ITEM_PREFIX.length));
          } else {
            setFilterName(optionValue);
          }
          combobox.closeDropdown();
        }}
        store={combobox}
        withinPortal={false}
      >
        <Combobox.Target>
          <TextInput
            placeholder="Filter by name or resource..."
            leftSection={
              value !== null ? (
                'name' in value ? (
                  <IconLetterCase size={16} />
                ) : (
                  <FactoryItemImage id={value.resource} size={16} />
                )
              ) : (
                <IconSearch stroke={2} size={16} />
              )
            }
            rightSection={
              value !== null ? (
                <ClearButton onClear={() => clearFilter()} />
              ) : null
            }
            value={
              value !== null
                ? 'name' in value
                  ? value.name
                  : AllFactoryItemsMap[value.resource].displayName
                : ''
            }
            onChange={event => {
              const { value } = event.currentTarget;

              if (!value) {
                clearFilter();
              } else {
                setFilterName(value);
              }

              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {options.length === 0 ? (
              <Combobox.Empty>Nothing found</Combobox.Empty>
            ) : (
              options
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  );
};

export function FactoriesFiltersSection(_props: IFactoriesFiltersSectionProps) {
  const factoryView = useUiStore(state => state.factoryView);
  const updateFactoryView = useUiStore(state => state.updateFactoryView);
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

        <SearchFilter />
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
