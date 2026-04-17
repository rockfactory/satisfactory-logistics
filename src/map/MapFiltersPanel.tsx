import {
  Badge,
  Button,
  Group,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconRefresh, IconSum } from '@tabler/icons-react';
import clsx from 'clsx';
import { type CSSProperties, useMemo } from 'react';
import { useShallowStore, useStore } from '@/core/zustand';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  getWorldResourceNodes,
  PURITIES,
  type Purity,
} from '@/recipes/WorldResourceNodes';
import { WorldResourcesList } from '@/recipes/WorldResources';
import classes from './MapFiltersPanel.module.css';
import { getPurityColor, getPurityLabel } from './markerIcons';
import { NO_GAME_USED_NODES_KEY } from './store/mapSlice';

const PURITY_SHORT: Record<Purity, string> = {
  impure: 'I',
  normal: 'N',
  pure: 'P',
};

/**
 * Shared empty array so `useShallowStore` selectors can return a
 * stable fallback when a game has no used-node marks yet. Returning a
 * fresh `[]` on every call would make the shallow-equal diff always
 * report the slice as changed and trigger pointless re-renders.
 */
const EMPTY_USED_NODES: readonly string[] = [];
/** Stable fallback for `resourceFilters` when the slice hasn't rehydrated yet. */
const EMPTY_RESOURCE_FILTERS: Record<string, Purity[]> = {};
/** Stable fallback for the per-game used-node map in mid-rehydrate states. */
const EMPTY_USED_BY_GAME: Record<string, string[]> = {};

export interface MapFiltersPanelProps {
  gameId?: string | null;
}

export function MapFiltersPanel({ gameId }: MapFiltersPanelProps) {
  const {
    resourceFilters,
    hideUsedNodes,
    usedNodesForGame,
    sumMode,
    selectedCount,
  } = useShallowStore(state => {
    const mapState = state.map;
    const usedByGame = mapState?.usedNodesByGame ?? EMPTY_USED_BY_GAME;
    return {
      resourceFilters: mapState?.resourceFilters ?? EMPTY_RESOURCE_FILTERS,
      hideUsedNodes: mapState?.hideUsedNodes ?? false,
      usedNodesForGame:
        usedByGame[gameId ?? NO_GAME_USED_NODES_KEY] ?? EMPTY_USED_NODES,
      sumMode: state.mapSelection?.sumMode ?? false,
      selectedCount: state.mapSelection?.selectedNodeIds.length ?? 0,
    };
  });
  const toggleResourcePurity = useStore(state => state.toggleResourcePurity);
  const setResourcePurities = useStore(state => state.setResourcePurities);
  const setAllResourcesEnabled = useStore(
    state => state.setAllResourcesEnabled,
  );
  const setOnlyPurity = useStore(state => state.setOnlyPurity);
  const setHideUsedNodes = useStore(state => state.setHideUsedNodes);
  const clearUsedNodes = useStore(state => state.clearUsedNodes);
  const resetMapFilters = useStore(state => state.resetMapFilters);
  const setSumMode = useStore(state => state.setSumMode);
  const clearSelection = useStore(state => state.clearSelection);

  const allNodes = useMemo(() => getWorldResourceNodes(gameId), [gameId]);

  /**
   * Counts nodes broken down as `counts[resource][purity]`. Computed
   * once per node list swap so toggling filters stays cheap.
   */
  const countsByResourcePurity = useMemo(() => {
    const counts: Record<string, Record<Purity, number>> = {};
    for (const node of allNodes) {
      let row = counts[node.resource];
      if (!row) {
        row = { impure: 0, normal: 0, pure: 0 };
        counts[node.resource] = row;
      }
      row[node.purity] += 1;
    }
    return counts;
  }, [allNodes]);

  const usedNodesCount = usedNodesForGame.length;

  return (
    <Stack
      gap="lg"
      p="md"
      className={classes.panel}
      data-tutorial-id="map-filters"
    >
      <Group justify="space-between" align="center">
        <Title order={5} className={classes.panelTitle}>
          Filters
        </Title>
        <Tooltip label="Reset all filters and used marks" withinPortal>
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            leftSection={<IconRefresh size={13} />}
            onClick={() => resetMapFilters()}
          >
            Reset
          </Button>
        </Tooltip>
      </Group>

      <Stack gap="xs" className={classes.sumSection} data-tutorial-id="map-sum">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Sum nodes
          </Text>
          {selectedCount > 0 ? (
            <Badge size="xs" variant="filled" color="violet">
              {selectedCount}
            </Badge>
          ) : null}
        </Group>
        <Button
          fullWidth
          size="sm"
          variant={sumMode ? 'filled' : 'light'}
          color="violet"
          leftSection={<IconSum size={16} />}
          onClick={() => setSumMode(!sumMode)}
        >
          {sumMode ? 'Exit sum mode' : 'Start summing nodes'}
        </Button>
        <Text size="xs" c="dimmed" className={classes.sumHint}>
          {sumMode
            ? 'Tap nodes on the map to add or remove them.'
            : 'Total extraction rates across several nodes.'}
        </Text>
        {selectedCount > 0 ? (
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            onClick={() => clearSelection()}
          >
            Clear selection ({selectedCount})
          </Button>
        ) : null}
      </Stack>

      <Stack gap="xs" data-tutorial-id="map-used-filter">
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Group gap={8} align="baseline" wrap="nowrap">
            <Text
              size="xs"
              fw={600}
              c="dimmed"
              tt="uppercase"
              className={classes.sectionTitle}
            >
              Used Nodes
            </Text>
            <Text size="xs" c="dimmed" className={classes.sectionCount}>
              {usedNodesCount}
            </Text>
          </Group>
          <Switch
            size="xs"
            checked={hideUsedNodes}
            onChange={event => setHideUsedNodes(event.currentTarget.checked)}
            aria-label="Hide used nodes on the map"
            label="Hide"
            labelPosition="left"
            styles={{
              label: { fontSize: 11, color: 'var(--mantine-color-dimmed)' },
            }}
          />
        </Group>
        {usedNodesCount > 0 ? (
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            justify="flex-start"
            className={classes.inlineAction}
            onClick={() => clearUsedNodes(gameId ?? null)}
          >
            Clear {usedNodesCount} used mark{usedNodesCount === 1 ? '' : 's'}
          </Button>
        ) : null}
      </Stack>

      <Stack gap="sm" data-tutorial-id="map-resource-filter">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            className={classes.sectionTitle}
          >
            Resources
          </Text>
          <Group gap={4} wrap="nowrap" data-tutorial-id="map-bulk-filter">
            <Tooltip label="Show every resource + purity" withinPortal>
              <button
                type="button"
                className={classes.miniAction}
                onClick={() => setAllResourcesEnabled(true)}
              >
                All
              </button>
            </Tooltip>
            <Tooltip label="Hide everything" withinPortal>
              <button
                type="button"
                className={classes.miniAction}
                onClick={() => setAllResourcesEnabled(false)}
              >
                None
              </button>
            </Tooltip>
          </Group>
        </Group>

        <div className={classes.purityOnlyRow}>
          <Text size="xs" c="dimmed" className={classes.purityOnlyLabel}>
            Only
          </Text>
          <Group gap={4} wrap="nowrap">
            {PURITIES.map(purity => (
              <Tooltip
                key={purity}
                label={`Show only ${getPurityLabel(purity)} nodes`}
                withinPortal
              >
                <button
                  type="button"
                  className={classes.purityOnlyChip}
                  style={
                    {
                      ['--chip-color' as string]: getPurityColor(purity),
                    } as CSSProperties
                  }
                  onClick={() => setOnlyPurity(purity)}
                >
                  <span className={classes.purityOnlyDot} />
                  {getPurityLabel(purity)}
                </button>
              </Tooltip>
            ))}
          </Group>
        </div>

        <Stack gap={3}>
          {WorldResourcesList.map(resource => {
            const item = AllFactoryItemsMap[resource];
            const counts = countsByResourcePurity[resource] ?? {
              impure: 0,
              normal: 0,
              pure: 0,
            };
            const selectedPurities = resourceFilters[resource] ?? [];
            const allSelected = selectedPurities.length === PURITIES.length;
            const noneSelected = selectedPurities.length === 0;

            return (
              <div
                key={resource}
                className={clsx(classes.resourceRow, {
                  [classes.resourceRowDim]: noneSelected,
                })}
              >
                <Tooltip
                  label={noneSelected ? 'Enable all purities' : 'Disable all'}
                  withinPortal
                >
                  <button
                    type="button"
                    className={classes.resourceLabel}
                    onClick={() =>
                      setResourcePurities(
                        resource,
                        allSelected || !noneSelected ? [] : [...PURITIES],
                      )
                    }
                  >
                    <FactoryItemImage id={resource} size={18} />
                    <Text size="sm" className={classes.resourceName}>
                      {item?.displayName ?? resource}
                    </Text>
                  </button>
                </Tooltip>
                <div className={classes.puritySegments}>
                  {PURITIES.map(purity => {
                    const count = counts[purity];
                    const active = selectedPurities.includes(purity);
                    const disabled = count === 0;
                    return (
                      <Tooltip
                        key={purity}
                        label={
                          disabled
                            ? `No ${getPurityLabel(purity).toLowerCase()} ${item?.displayName ?? resource} nodes`
                            : `${getPurityLabel(purity)} · ${count} node${count === 1 ? '' : 's'}`
                        }
                        withinPortal
                      >
                        <button
                          type="button"
                          className={clsx(classes.puritySegment, {
                            [classes.puritySegmentActive]: active,
                            [classes.puritySegmentEmpty]: disabled,
                          })}
                          style={
                            {
                              ['--chip-color' as string]:
                                getPurityColor(purity),
                            } as CSSProperties
                          }
                          aria-pressed={active}
                          aria-label={`${getPurityLabel(purity)} ${item?.displayName ?? resource} (${count})`}
                          disabled={disabled}
                          onClick={() => toggleResourcePurity(resource, purity)}
                        >
                          <span className={classes.puritySegmentLetter}>
                            {PURITY_SHORT[purity]}
                          </span>
                          <span className={classes.puritySegmentCount}>
                            {count}
                          </span>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}
