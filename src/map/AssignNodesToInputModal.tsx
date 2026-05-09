import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconTrash, IconWorld } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/core/zustand';
import { WORLD_SOURCE_ID } from '@/factories/Factory';
import { useNodeAssignments } from '@/factories/store/factoryNodeAssignmentsSelectors';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';

export interface AssignNodesToInputModalProps {
  opened: boolean;
  onClose: () => void;
  gameId: string | null;
  nodeIds: string[];
  resource: string | null;
}

// Sentinel for the "Create new World input" option in the input
// dropdown — never collides with a real input index.
const CREATE_NEW_VALUE = '__create__';

interface ExistingAssignment {
  factoryId: string;
  factoryName: string | null;
  inputIndex: number;
  /** Subset of `nodeIds` that is currently assigned to this input. */
  matchedNodeIds: string[];
}

/**
 * Modal flow:
 *   1. Lists every (factory, input) pair that already has at least one
 *      of the selected nodes assigned to it, each with a remove button.
 *   2. Cascading dropdowns (factory → input) to add a new assignment.
 *      Hitting "Add" assigns and resets the dropdowns WITHOUT closing,
 *      so the user can chain "this node is fed by 3 factories" in one
 *      session.
 *   3. "Done" closes. Selection is intentionally NOT cleared here —
 *      the caller decides whether the multi-select stays alive after
 *      assignment (e.g. the sum-mode summary keeps it).
 */
export function AssignNodesToInputModal({
  opened,
  onClose,
  gameId,
  nodeIds,
  resource,
}: AssignNodesToInputModalProps) {
  const factories = useGameFactories(gameId);
  const item = resource ? AllFactoryItemsMap[resource] : undefined;

  // ─── Existing-assignments view: re-uses the same selector that
  //     drives the map badges, then groups by (factory, input) so the
  //     user sees one row per binding instead of one per node.
  const allAssignments = useNodeAssignments(gameId);
  const existingAssignments = useMemo<ExistingAssignment[]>(() => {
    const byKey = new Map<string, ExistingAssignment>();
    for (const nodeId of nodeIds) {
      const refs = allAssignments[nodeId] ?? [];
      for (const ref of refs) {
        const key = `${ref.factoryId}::${ref.inputIndex}`;
        const existing = byKey.get(key);
        if (existing) {
          existing.matchedNodeIds.push(nodeId);
        } else {
          byKey.set(key, {
            factoryId: ref.factoryId,
            factoryName: ref.factoryName,
            inputIndex: ref.inputIndex,
            matchedNodeIds: [nodeId],
          });
        }
      }
    }
    return Array.from(byKey.values());
  }, [allAssignments, nodeIds]);

  // ─── Picker state. Reset on every modal open so a previous session
  //     doesn't bleed in.
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string | null>(null);
  useEffect(() => {
    if (opened) {
      setFactoryId(null);
      setInputValue(null);
    }
  }, [opened]);

  // Factory dropdown: any named factory in the current game.
  const factoryOptions = useMemo(
    () =>
      factories
        .filter(f => f.name)
        .map(f => ({ value: f.id, label: f.name as string })),
    [factories],
  );

  const selectedFactory = useMemo(
    () => factories.find(f => f.id === factoryId) ?? null,
    [factories, factoryId],
  );

  // Input dropdown: World inputs of the selected factory matching
  // `resource`, plus a synthetic "create new" affordance.
  const inputOptions = useMemo(() => {
    if (!selectedFactory) return [];
    const matching = (selectedFactory.inputs ?? [])
      .map((input, inputIndex) => ({ input, inputIndex }))
      .filter(
        ({ input }) =>
          input.factoryId === WORLD_SOURCE_ID && input.resource === resource,
      );

    const options = matching.map(({ input, inputIndex }) => {
      const existing = input.nodeIds?.length ?? 0;
      const amount = input.amount ? ` · ${input.amount}/min` : '';
      const tail = existing > 0 ? ` · ${existing} already assigned` : '';
      return {
        value: String(inputIndex),
        label: `Input #${inputIndex + 1}${amount}${tail}`,
      };
    });

    options.push({
      value: CREATE_NEW_VALUE,
      label: `+ Create new World input${item?.name ? ` for ${item.name}` : ''}`,
    });
    return options;
  }, [selectedFactory, resource, item?.name]);

  // Auto-pick the only existing input when there's exactly one match
  // (the second option is always the "Create new" affordance).
  useEffect(() => {
    if (!selectedFactory) return;
    if (inputValue !== null) return;
    if (inputOptions.length === 2) setInputValue(inputOptions[0].value);
  }, [selectedFactory, inputOptions, inputValue]);

  // ─── Add handler: assigns and resets dropdowns. Does NOT close the
  //     modal so the user can chain multiple assignments.
  const handleAdd = () => {
    if (!factoryId || !inputValue || !resource) return;
    const state = useStore.getState();

    if (inputValue === CREATE_NEW_VALUE) {
      let newInputIndex = -1;
      state.updateFactoryAndSolverRequest(factoryId, obj => {
        const factory = obj as {
          inputs: (typeof factories)[number]['inputs'];
        };
        factory.inputs ??= [];
        factory.inputs.push({
          factoryId: WORLD_SOURCE_ID,
          resource,
          amount: 0,
        });
        newInputIndex = factory.inputs.length - 1;
      });
      if (newInputIndex < 0) return;
      state.assignNodesToFactoryInput(
        factoryId,
        newInputIndex,
        nodeIds,
        gameId,
      );
    } else {
      state.assignNodesToFactoryInput(
        factoryId,
        Number(inputValue),
        nodeIds,
        gameId,
      );
    }

    // Reset for the next chained assignment. The "Already assigned"
    // list will re-render automatically via the store subscription.
    setFactoryId(null);
    setInputValue(null);
  };

  // ─── Remove handler: unassigns ALL matched nodes from a single
  //     (factory, input) pair. The action mutates one node at a time
  //     because the underlying store action is per-node — this is fine
  //     in practice, the loop runs inside one React render.
  const handleRemove = (entry: ExistingAssignment) => {
    const state = useStore.getState();
    for (const nodeId of entry.matchedNodeIds) {
      state.unassignNodeFromFactoryInput(
        entry.factoryId,
        entry.inputIndex,
        nodeId,
      );
    }
  };

  const canAdd =
    !!factoryId && !!inputValue && !!resource && nodeIds.length > 0;
  const totalNodes = nodeIds.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          {item?.imagePath ? (
            <img
              src={item.imagePath}
              alt={item.name}
              style={{ width: 24, height: 24 }}
            />
          ) : (
            <IconWorld size={20} />
          )}
          <Text fw={600}>
            Assign {totalNodes} node{totalNodes === 1 ? '' : 's'}
            {item?.name ? ` of ${item.name}` : ''}
          </Text>
        </Group>
      }
    >
      {!resource ? (
        <Text c="dimmed" size="sm">
          Select nodes of a single resource to assign them to a factory input.
        </Text>
      ) : (
        <Stack gap="md">
          {/* ─── Existing assignments: full-bleed Mantine Table,
              same visual idiom as the calculator's peek modals. */}
          <Stack gap={6}>
            <Text size="sm" fw={600}>
              Currently assigned to
            </Text>
            {existingAssignments.length === 0 ? (
              <Text size="xs" c="dimmed">
                No assignments yet — pick a factory and input below.
              </Text>
            ) : (
              <Table withRowBorders={false} verticalSpacing={4}>
                <Table.Tbody>
                  {existingAssignments.map(entry => (
                    <Table.Tr
                      key={`${entry.factoryId}::${entry.inputIndex}`}
                    >
                      <Table.Td>
                        <Text size="sm" truncate="end">
                          {entry.factoryName ?? 'Unnamed factory'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ width: 110 }}>
                        <Badge size="xs" variant="light" color="blue">
                          Input #{entry.inputIndex + 1}
                        </Badge>
                      </Table.Td>
                      <Table.Td
                        style={{ width: 70, color: 'var(--mantine-color-dimmed)' }}
                      >
                        {totalNodes > 1 ? (
                          <Text size="xs" c="dimmed">
                            {entry.matchedNodeIds.length}/{totalNodes}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td style={{ width: 40, textAlign: 'right' }}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleRemove(entry)}
                          aria-label="Remove assignment"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>

          <Divider />

          {/* ─── Add-another picker. All on one row: factory select,
              input select, button. Modal is `size="lg"` so the row
              has room to breathe. Labels above are `null` because
              the section header already names the controls and we
              want the row to be visually compact. */}
          <Stack gap={6}>
            <Text size="sm" fw={600}>
              Add to another input
            </Text>

            {factoryOptions.length === 0 ? (
              <Text size="xs" c="dimmed">
                No factories in this game yet — create one first.
              </Text>
            ) : (
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <Select
                  label="Factory"
                  placeholder="Choose a factory…"
                  data={factoryOptions}
                  value={factoryId}
                  onChange={value => {
                    setFactoryId(value);
                    setInputValue(null);
                  }}
                  searchable
                  comboboxProps={{ withinPortal: true }}
                  style={{ flex: 1, minWidth: 0 }}
                />

                <Select
                  label="Input"
                  placeholder={
                    factoryId ? 'Choose an input…' : 'Pick a factory first'
                  }
                  data={inputOptions}
                  value={inputValue}
                  onChange={setInputValue}
                  disabled={!factoryId}
                  comboboxProps={{ withinPortal: true }}
                  style={{ flex: 1, minWidth: 0 }}
                />

                <Button onClick={handleAdd} disabled={!canAdd}>
                  Add
                </Button>
              </Group>
            )}
          </Stack>

          <Divider />

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Done
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
