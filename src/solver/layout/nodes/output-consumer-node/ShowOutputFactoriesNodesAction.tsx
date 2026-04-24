import { Select, Stack, Text } from '@mantine/core';
import {
  setShowOutputFactoriesNodes,
  useShowOutputFactoriesNodes,
} from '@/games/gamesSlice';
import { SHOW_OUTPUT_FACTORIES_NODES_OPTIONS } from '@/games/settings/showOutputFactoriesNodesOptions';

const SELECT_DATA = SHOW_OUTPUT_FACTORIES_NODES_OPTIONS.map(o => ({
  value: o.value,
  label: o.label,
}));

/**
 * Inline editor for the per-game `showOutputFactoriesNodes` setting,
 * embedded in the OutputConsumer / Unallocated node popovers so the
 * user can hide the new node category from inside the graph itself
 * without hunting for the game-settings modal.
 */
export function ShowOutputFactoriesNodesAction() {
  const mode = useShowOutputFactoriesNodes();
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        Show output factory nodes
      </Text>
      <Select
        size="xs"
        data={SELECT_DATA}
        value={mode}
        allowDeselect={false}
        onChange={value => {
          if (value == null) return;
          setShowOutputFactoriesNodes(
            value as (typeof SELECT_DATA)[number]['value'],
          );
        }}
      />
    </Stack>
  );
}
