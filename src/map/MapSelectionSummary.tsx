import {
  Button,
  Group,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLink, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useShallowStore, useStore } from '@/core/zustand';
import { AllFactoryBuildings } from '@/recipes/FactoryBuilding';
import { getWorldResourceNodes } from '@/recipes/WorldResourceNodes';
import { AssignNodesToInputModal } from './AssignNodesToInputModal';
import { OVERCLOCK_STEPS, type OverclockStep } from './extraction';
import classes from './MapSelectionSummary.module.css';
import { getSelectionAggregates, SOLID_MINER_CHOICES } from './selectionMath';

export interface MapSelectionSummaryProps {
  gameId: string | null;
}

const EMPTY_SELECTED_NODE_IDS: readonly string[] = [];

/**
 * Floating panel at the bottom of the map that sums the selected
 * nodes' extraction rates per resource at a chosen miner tier and
 * overclock. Hidden entirely when the selection is empty so it
 * doesn't occlude the map.
 */
export function MapSelectionSummary({ gameId }: MapSelectionSummaryProps) {
  const { selectedNodeIds, selectedMinerId, selectedOverclock, sumMode } =
    useShallowStore(state => ({
      selectedNodeIds:
        state.mapSelection?.selectedNodeIds ?? EMPTY_SELECTED_NODE_IDS,
      selectedMinerId:
        state.mapSelection?.selectedMinerId ?? 'Build_MinerMk3_C',
      selectedOverclock: (state.mapSelection?.selectedOverclock ??
        100) as OverclockStep,
      sumMode: state.mapSelection?.sumMode ?? false,
    }));

  // Subscribe to the per-game savegame node overrides so the memo
  // re-evaluates after a `.sav` import: `getWorldResourceNodes` reads
  // them via `useStore.getState()` synchronously, but without an
  // explicit dep this `useMemo` would keep returning the pre-import
  // (static-only) projection.
  const savegameOverrides = useStore(state =>
    gameId ? state.games.games[gameId]?.savegameNodeOverrides : undefined,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: savegameOverrides is read indirectly via getWorldResourceNodes' useStore.getState() lookup; the dep is required to invalidate the memo on import.
  const selectedNodes = useMemo(() => {
    const selectedSet = new Set(selectedNodeIds);
    return getWorldResourceNodes(gameId).filter(n => selectedSet.has(n.id));
  }, [gameId, selectedNodeIds, savegameOverrides]);

  const aggregates = useMemo(
    () =>
      getSelectionAggregates(selectedNodes, selectedMinerId, selectedOverclock),
    [selectedNodes, selectedMinerId, selectedOverclock],
  );

  // Solid-miner <Select> options — only show the solid miners we
  // know how to price, in tier order. Falls back to the building's
  // id when a name lookup fails.
  const minerOptions = useMemo(
    () =>
      SOLID_MINER_CHOICES.map(id => ({
        value: id,
        label: AllFactoryBuildings.find(b => b.id === id)?.name ?? id,
      })),
    [],
  );

  // The "Assign to factory input…" action only makes sense when the
  // selection is homogeneous (a single input takes a single resource).
  const homogeneousResource = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    const first = selectedNodes[0].resource;
    return selectedNodes.every(n => n.resource === first) ? first : null;
  }, [selectedNodes]);

  const [assignModalOpened, assignModal] = useDisclosure(false);

  if (selectedNodeIds.length === 0) return null;

  const handleClear = () => useStore.getState().clearSelection();

  return (
    <section
      className={classes.panel}
      aria-label="Selected nodes summary"
      data-tutorial-id="map-selection-summary"
    >
      <div className={classes.header}>
        <div className={classes.title}>
          <span className={classes.count}>{selectedNodeIds.length}</span>
          <Text fw={600} size="sm">
            Node{selectedNodeIds.length === 1 ? '' : 's'} selected
          </Text>
          {sumMode ? (
            <Text size="xs" c="violet.4" fw={600}>
              · Sum mode on
            </Text>
          ) : null}
        </div>
        <div className={classes.controls}>
          <Select
            size="xs"
            label={null}
            value={selectedMinerId}
            onChange={value => {
              if (value) useStore.getState().setSelectedMinerId(value);
            }}
            data={minerOptions}
            w={140}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
            aria-label="Solid-miner tier"
          />
          <SegmentedControl
            size="xs"
            value={String(selectedOverclock)}
            onChange={value =>
              useStore
                .getState()
                .setSelectedOverclock(Number(value) as OverclockStep)
            }
            data={OVERCLOCK_STEPS.map(step => ({
              value: String(step),
              label: `${step}%`,
            }))}
            aria-label="Overclock percentage"
          />
          <Tooltip
            label={
              homogeneousResource
                ? 'Assign these nodes to a factory World input'
                : 'Select a single resource type to assign.'
            }
            withArrow
          >
            <Button
              variant="light"
              color="blue"
              size="compact-sm"
              leftSection={<IconLink size={14} />}
              onClick={assignModal.open}
              disabled={!homogeneousResource}
              data-tutorial-id="map-assign-to-input"
            >
              Assign to input…
            </Button>
          </Tooltip>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconX size={14} />}
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </div>

      {aggregates.length === 0 ? (
        <Text size="xs" c="dimmed" fs="italic">
          No extractable resources in selection.
        </Text>
      ) : (
        <div className={classes.body}>
          {aggregates.map(a => (
            <div key={a.key} className={classes.row}>
              <div className={classes.rowText}>
                <div className={classes.rowName}>{a.displayName}</div>
                <div className={classes.rowMeta}>
                  {a.nodeCount} node{a.nodeCount === 1 ? '' : 's'}
                  {a.purityCounts.pure > 0 ? ` · ${a.purityCounts.pure}P` : ''}
                  {a.purityCounts.normal > 0
                    ? ` · ${a.purityCounts.normal}N`
                    : ''}
                  {a.purityCounts.impure > 0
                    ? ` · ${a.purityCounts.impure}I`
                    : ''}
                  {' · '}
                  {a.extractorName}
                </div>
              </div>
              <div className={classes.rowTotal}>
                {a.totalRate.toLocaleString('en-US')}
                <span className={classes.rowUnit}>{a.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Group justify="flex-end" mt={2}>
        <Text size="xs" c="dimmed">
          Totals assume all nodes extracted simultaneously at the chosen
          settings.
        </Text>
      </Group>

      <AssignNodesToInputModal
        opened={assignModalOpened}
        onClose={assignModal.close}
        gameId={gameId}
        nodeIds={selectedNodeIds.slice()}
        resource={homogeneousResource}
      />
    </section>
  );
}
