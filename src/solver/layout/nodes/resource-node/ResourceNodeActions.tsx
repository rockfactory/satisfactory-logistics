import { useStore } from '@/core/zustand';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { ActionIcon, Group, Stack, Tooltip } from '@mantine/core';
import { IconEye, IconEyeOff, IconTrash } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import type { IResourceNodeData } from './ResourceNode';

export interface IResourceNodeActionsProps {
  id: string;
  data: IResourceNodeData;
}

export function ResourceNodeActions(props: IResourceNodeActionsProps) {
  const {
    id,
    data: { resource, isRaw, value, input },
  } = props;

  const solverId = useParams<{ id: string }>().id;
  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );
  return (
    <Stack gap="sm" align="flex-start">
      <Group gap="sm">
        {!input && (
          <Tooltip
            w="400"
            multiline
            label="Block this resource. Only factory inputs will be utilized, but the calculator will not attempt to allocate any additional amount"
          >
            <ActionIcon
              color="red"
              variant="outline"
              onClick={() =>
                useStore
                  .getState()
                  .toggleBlockedResource(solverId!, resource.id, true)
              }
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}

        {/* Replace with Factory Input */}
        {!input && (
          <Tooltip label="Add an Input of the same amount">
            <ActionIcon
              color="blue"
              variant="outline"
              onClick={() =>
                useStore.getState().addFactoryInput(solverId!, {
                  resource: resource.id,
                  amount: value,
                })
              }
            >
              <FactoryInputIcon size={16} />
            </ActionIcon>
          </Tooltip>
        )}

        {/* Ignore edges */}
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
