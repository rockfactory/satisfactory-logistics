import { useStore } from '@/core/zustand';
import { ActionIcon, Group, Stack, Tooltip } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import type { IResourceNodeData } from './ResourceNode';

export interface IResourceNodeActionsProps {
  id: string;
  data: IResourceNodeData;
}

export function ResourceNodeActions(props: IResourceNodeActionsProps) {
  const { id, data } = props;

  const solverId = useParams<{ id: string }>().id;
  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );
  return (
    <Stack gap="sm" align="flex-start">
      <Group gap="sm">
        <Tooltip
          label={nodeState?.layoutIgnoreEdges ? 'Show edges' : 'Hide edges'}
        >
          <ActionIcon
            color="gray"
            variant={nodeState?.layoutIgnoreEdges ? 'filled' : 'outline'}
            onClick={() => {
              useStore
                .getState()
                .updateSolverNode(solverId!, props.id, node => {
                  node.layoutIgnoreEdges = !node.layoutIgnoreEdges;
                });
            }}
          >
            {nodeState?.layoutIgnoreEdges ? (
              <IconEye size={16} />
            ) : (
              <IconEyeOff size={16} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );
}
