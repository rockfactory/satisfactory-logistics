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
import {
  IconBrush,
  IconCheck,
  IconDeviceAudioTape,
  IconPackage,
  IconRefresh,
  IconSum,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { useShallowStore, useStore } from '@/core/zustand';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  COLLECTIBLE_TYPE_META,
  COLLECTIBLE_TYPES,
  type CollectibleType,
  getWorldCollectibles,
} from '@/recipes/WorldCollectibles';
import {
  getWorldResourceNodes,
  PURITIES,
  type Purity,
} from '@/recipes/WorldResourceNodes';
import { WorldResourcesList } from '@/recipes/WorldResources';
import classes from './MapFiltersPanel.module.css';
import { getPurityColor, getPurityLabel } from './markerIcons';

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
/** Stable fallback for collectible visibility before rehydrate finishes. */
const EMPTY_COLLECTIBLE_VISIBILITY: Record<CollectibleType, boolean> = (() => {
  const visibility = {} as Record<CollectibleType, boolean>;
  for (const type of COLLECTIBLE_TYPES) visibility[type] = true;
  return visibility;
})();
/** Empty list mirror of {@link EMPTY_USED_NODES} for collectibles. */
const EMPTY_COLLECTED_LIST: readonly string[] = [];

/**
 * Bundled-asset icons for collectible categories that have in-game
 * art (slugs, somersloops, mercer spheres). Tabler-icon fallbacks
 * cover hard drives, audio tapes, and customization unlocks where
 * the game ships no representative icon we can reuse. Keys are
 * `iconName` from {@link COLLECTIBLE_TYPE_META} so we can swap
 * implementations without changing the meta data.
 */
const TABLER_ICON_BY_NAME: Record<string, ReactNode> = {
  IconPackage: <IconPackage size={16} />,
  IconDeviceAudioTape: <IconDeviceAudioTape size={16} />,
  IconBrush: <IconBrush size={16} />,
};

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
    collectibleVisibility,
    hideCollectedCollectibles,
    collectedForGame,
  } = useShallowStore(state => {
    const mapState = state.map;
    const game = gameId ? state.games.games[gameId] : null;
    return {
      resourceFilters: mapState?.resourceFilters ?? EMPTY_RESOURCE_FILTERS,
      hideUsedNodes: mapState?.hideUsedNodes ?? false,
      usedNodesForGame: game?.usedNodes ?? EMPTY_USED_NODES,
      sumMode: state.mapSelection?.sumMode ?? false,
      selectedCount: state.mapSelection?.selectedNodeIds.length ?? 0,
      collectibleVisibility:
        mapState?.collectibleVisibility ?? EMPTY_COLLECTIBLE_VISIBILITY,
      hideCollectedCollectibles: mapState?.hideCollectedCollectibles ?? false,
      collectedForGame: game?.collectedItems ?? EMPTY_COLLECTED_LIST,
    };
  });
  const toggleResourcePurity = useStore(state => state.toggleResourcePurity);
  const setResourcePurities = useStore(state => state.setResourcePurities);
  const setAllResourcesEnabled = useStore(
    state => state.setAllResourcesEnabled,
  );
  const setOnlyPurity = useStore(state => state.setOnlyPurity);
  const setHideUsedNodes = useStore(state => state.setHideUsedNodes);
  const clearGameUsedNodes = useStore(state => state.clearGameUsedNodes);
  const resetMapFilters = useStore(state => state.resetMapFilters);
  const setSumMode = useStore(state => state.setSumMode);
  const clearSelection = useStore(state => state.clearSelection);
  const toggleCollectibleType = useStore(state => state.toggleCollectibleType);
  const setAllCollectiblesVisible = useStore(
    state => state.setAllCollectiblesVisible,
  );
  const setHideCollectedCollectibles = useStore(
    state => state.setHideCollectedCollectibles,
  );
  const clearGameCollectedItems = useStore(
    state => state.clearGameCollectedItems,
  );

  const allNodes = useMemo(() => getWorldResourceNodes(gameId), [gameId]);
  const allCollectibles = useMemo(() => getWorldCollectibles(), []);

  /**
   * Per-type counts of all collectibles in the world. Computed once
   * since the source data is static. Used both for the per-row
   * "(N)" total and the overall "X of Y" header.
   */
  const collectibleTotalsByType = useMemo(() => {
    const totals = {} as Record<CollectibleType, number>;
    for (const type of COLLECTIBLE_TYPES) totals[type] = 0;
    for (const c of allCollectibles) totals[c.type] += 1;
    return totals;
  }, [allCollectibles]);

  /**
   * How many of each collectible type the player has marked
   * collected in the current game. Recomputed only when the
   * collected list shape changes, since the underlying static
   * collectibles never change at runtime.
   */
  const collectedCountsByType = useMemo(() => {
    const counts = {} as Record<CollectibleType, number>;
    for (const type of COLLECTIBLE_TYPES) counts[type] = 0;
    if (collectedForGame.length === 0) return counts;
    const collectedSet = new Set(collectedForGame);
    for (const c of allCollectibles) {
      if (collectedSet.has(c.id)) counts[c.type] += 1;
    }
    return counts;
  }, [allCollectibles, collectedForGame]);

  const totalCollectibles = allCollectibles.length;
  const totalCollected = collectedForGame.length;

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
            onClick={() => clearGameUsedNodes(gameId ?? null)}
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

      <Stack gap="xs" data-tutorial-id="map-collectibles-filter">
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            className={classes.sectionTitle}
          >
            Collectibles
          </Text>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Show every collectible" withinPortal>
              <button
                type="button"
                className={classes.miniAction}
                onClick={() => setAllCollectiblesVisible(true)}
              >
                All
              </button>
            </Tooltip>
            <Tooltip label="Hide every collectible" withinPortal>
              <button
                type="button"
                className={classes.miniAction}
                onClick={() => setAllCollectiblesVisible(false)}
              >
                None
              </button>
            </Tooltip>
          </Group>
        </Group>

        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Group gap={6} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed" className={classes.sectionCount}>
              {totalCollected} / {totalCollectibles} collected
            </Text>
            {totalCollected > 0 ? (
              <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                px={6}
                onClick={() => clearGameCollectedItems(gameId ?? null)}
              >
                Clear
              </Button>
            ) : null}
          </Group>
          {totalCollected > 0 ? (
            <Switch
              size="xs"
              checked={hideCollectedCollectibles}
              onChange={event =>
                setHideCollectedCollectibles(event.currentTarget.checked)
              }
              aria-label="Hide collected collectibles on the map"
              label="Hide"
              labelPosition="left"
              styles={{
                label: { fontSize: 11, color: 'var(--mantine-color-dimmed)' },
              }}
            />
          ) : null}
        </Group>

        <Stack gap={3}>
          {COLLECTIBLE_TYPES.map(type => {
            const meta = COLLECTIBLE_TYPE_META[type];
            const total = collectibleTotalsByType[type];
            const collected = collectedCountsByType[type];
            const visible = collectibleVisibility[type];
            const empty = total === 0;

            return (
              <div
                key={type}
                className={clsx(classes.collectibleRow, {
                  [classes.collectibleRowDim]: !visible,
                  [classes.collectibleRowEmpty]: empty,
                })}
                style={
                  { ['--chip-color' as string]: meta.color } as CSSProperties
                }
              >
                <Tooltip
                  label={
                    empty
                      ? `No ${meta.displayName.toLowerCase()} on this map`
                      : visible
                        ? `Hide ${meta.displayName.toLowerCase()}`
                        : `Show ${meta.displayName.toLowerCase()}`
                  }
                  withinPortal
                >
                  <button
                    type="button"
                    className={classes.collectibleLabel}
                    aria-pressed={visible}
                    disabled={empty}
                    onClick={() => toggleCollectibleType(type)}
                  >
                    <span
                      className={classes.collectibleSwatch}
                      aria-hidden="true"
                    >
                      {meta.iconImagePath ? (
                        <img src={meta.iconImagePath} alt="" />
                      ) : meta.iconName ? (
                        TABLER_ICON_BY_NAME[meta.iconName]
                      ) : null}
                    </span>
                    <span className={classes.collectibleName}>
                      {meta.displayName}
                    </span>
                    <span className={classes.collectibleProgress}>
                      {collected > 0 ? (
                        <IconCheck
                          size={10}
                          className={classes.collectibleCheck}
                          aria-hidden="true"
                        />
                      ) : null}
                      {collected} / {total}
                    </span>
                  </button>
                </Tooltip>
              </div>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}
