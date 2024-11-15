import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { useShallowStore } from '@/core/zustand';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { WORLD_SOURCE_ID, type FactoryInput } from '@/factories/Factory';
import type { FactoryItem } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { isWorldResource } from '@/recipes/WorldResources';
import type { SolverNodeState } from '@/solver/store/Solver';
import { Box, Flex, Group, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTransformFilled } from '@tabler/icons-react';
import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useParams } from 'react-router-dom';
import { InvisibleHandles } from '../../rendering/InvisibleHandles';
import { useSolverSolution } from '../../solution-context/SolverSolutionContext';
import { NodeActionsBox } from '../utils/NodeActionsBox';
import { ResourceNodeActions } from './ResourceNodeActions';
import { ResourceNodeExtractorDetail } from './ResourceNodeExtractorDetail';
import { ResourceNodeInput } from './ResourceNodeInput';

export type IResourceNodeData = {
  resource: FactoryItem;
  value: number;
  /**
   * Indicates if this resource is an input to the solver or
   * an automatically added World resource.
   */
  isRaw: boolean;
  input?: FactoryInput;
  inputIndex?: number;

  state?: SolverNodeState;
};

export type IResourceNodeProps = NodeProps & {
  data: IResourceNodeData;
  type: 'Resource';
};

export const ResourceNode = memo((props: IResourceNodeProps) => {
  const { id } = props;
  const { resource, value, isRaw, input } = props.data;

  const { solution } = useSolverSolution();

  const isWorld = isWorldResource(resource.id);

  const [isHovering, { close, open }] = useDisclosure(false);

  const solverId = useParams<{ id: string }>().id;

  // If this is an input to the solver, we need to show the factory
  const sourceFactory = useShallowStore(state => {
    if (!input) return undefined;
    if (input.factoryId === WORLD_SOURCE_ID) return WORLD_SOURCE_ID;
    const factory = state.factories.factories[input.factoryId ?? ''];
    return {
      id: factory?.id,
      name: factory?.name,
      // TODO Support multiple outputs
      outputAmount: factory?.outputs.find(o => o.resource === resource.id)
        ?.amount,
    };
  });

  return (
    <Popover
      opened={(isHovering || props.selected) && !props.dragging}
      transitionProps={{}}
    >
      <Popover.Target>
        <Box
          p="sm"
          style={{
            borderRadius: 4,
            border: props.selected
              ? '1px solid var(--mantine-color-gray-3)'
              : '1px solid transparent',
          }}
          bg={isRaw ? 'blue.8' : 'blue.6'}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Group gap="xs">
            <Box pos="relative">
              {input?.constraint === 'exact' && (
                <div style={{ position: 'absolute', left: -6, bottom: -16 }}>
                  <Tooltip label="Forced usage. Recipes chosen can be less resource-efficient due do this choice.">
                    <IconTransformFilled size={16} />
                  </Tooltip>
                </div>
              )}
              <FactoryItemImage id={resource.id} size={32} highRes />
            </Box>
            <Stack gap={2} align="center">
              <Group gap={4}>
                {typeof sourceFactory === 'object' && sourceFactory.name ? (
                  <Text size="sm">{sourceFactory.name}:</Text>
                ) : null}
                <Text size="sm">{resource.displayName}</Text>
              </Group>
              <Group gap={4} align="center">
                {sourceFactory != null && (
                  <Tooltip
                    label="Input from another factory"
                    disabled={sourceFactory === WORLD_SOURCE_ID}
                  >
                    <FactoryInputIcon size={16} stroke={2} />
                  </Tooltip>
                )}
                <Text size="xs">
                  <RepeatingNumber value={value} />
                  /min
                </Text>
              </Group>
            </Stack>
          </Group>

          <InvisibleHandles />
        </Box>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Flex
          align="stretch"
          gap={0}
          direction={{
            base: 'column',
            sm: 'row',
          }}
        >
          <Stack gap={0}>
            <ResourceNodeInput
              selected={props.selected}
              id={id}
              data={props.data}
              sourceFactory={sourceFactory}
            />
            {isWorld && (
              <ResourceNodeExtractorDetail
                id={props.id}
                solverId={solverId!}
                data={props.data}
              />
            )}
          </Stack>
          <NodeActionsBox>
            {props.selected ? (
              <ResourceNodeActions data={props.data} id={props.id} />
            ) : (
              <Stack>
                <Text fs="italic" size="sm">
                  Click on the node to see available actions, like editing
                  amount.
                </Text>
              </Stack>
            )}
          </NodeActionsBox>
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
});
