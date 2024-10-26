import {
  ActionIcon,
  Badge,
  Box,
  CloseButton,
  Group,
  Image,
  Popover,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBolt,
  IconBuildingFactory2,
  IconCircleCheckFilled,
  IconClockBolt,
  IconTrash,
} from '@tabler/icons-react';
import { NodeProps, useReactFlow } from '@xyflow/react';
import { memo } from 'react';
import { useParams } from 'react-router-dom';

import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { RepeatingNumber } from '../../core/intl/NumberFormatter';
import { useStore } from '../../core/zustand';
import { AllFactoryBuildingsMap } from '../../recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '../../recipes/FactoryItem';
import {
  FactoryRecipe,
  getRecipeDisplayName,
  getRecipeProductPerBuilding,
} from '../../recipes/FactoryRecipe';
import { SwitchRecipeAction } from '../page/actions/SwitchRecipeAction';
import { InvisibleHandles } from './InvisibleHandles';
import { RecipeIngredientRow } from './machine-node/RecipeIngredientRow';

export interface IMachineNodeData {
  label: string;
  value: number;
  recipe: FactoryRecipe;
  [key: string]: unknown;
}

export type IMachineNodeProps = NodeProps & {
  data: IMachineNodeData;
  type: 'Machine';
};

export const MachineNode = memo((props: IMachineNodeProps) => {
  const { recipe, value } = props.data;
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const isAlt = recipe.name.includes('Alternate');
  const { updateNode } = useReactFlow();

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);
  const buildingsAmount = value / perBuilding;

  const [isHovering, { close, open }] = useDisclosure(false);

  const solverId = useParams<{ id: string }>().id;

  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );

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
          bg={nodeState?.done ? '#1d5b3a' : 'dark.4'}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          {nodeState?.done && (
            <div style={{ position: 'absolute', left: -8, top: -8 }}>
              {/* <Badge size="sm" color="green" circle> */}
              <IconCircleCheckFilled size={16} />
              {/* </Badge> */}
            </div>
          )}
          {/* <NodeToolbar>
            <ActionIcon
              variant="outline"
              color="red"
              size="sm"
              mt={3}
              onClick={() =>
                dispatch(
                  solverActions.toggleRecipe({
                    id: solverId,
                    use: false,
                    recipe: recipe.id,
                  }),
                )
              }
            >
              <IconTrash size={16} stroke={1.5} />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              color="green"
              size="sm"
              mt={3}
              onClick={() =>
                dispatch(
                  solverActions.updateAtPath({
                    id: solverId,
                    path: `nodes.${props.id}.done`,
                    value: true,
                  }),
                )
              }
            >
              <IconCheck size={16} stroke={1.5} />
            </ActionIcon>
          </NodeToolbar> */}

          <Group gap="sm">
            <Image w="32" h="32" src={building.imagePath} />
            <Stack gap={2} align="center">
              <Group gap="xs">
                {isAlt && (
                  <Badge size="xs" color="yellow">
                    ALT
                  </Badge>
                )}
                <Text size="sm">{getRecipeDisplayName(recipe)}</Text>
              </Group>
              <Text size="xs">
                x<RepeatingNumber value={buildingsAmount} /> {building.name}
              </Text>
            </Stack>
            <FactoryItemImage id={product.id} size={32} highRes />
          </Group>

          <InvisibleHandles />
        </Box>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group align="flex-start" gap={0}>
          <Stack gap={0}>
            <Box
              p="sm"
              bg="dark.5"
              style={{
                borderRadius: '4px 0 0 0',
              }}
            >
              <Group gap="sm" justify="space-between" align="flex-start">
                <Title order={5} mb="xs">
                  {getRecipeDisplayName(recipe)}
                </Title>
                {props.selected && (
                  <CloseButton
                    size="sm"
                    onClick={() => {
                      updateNode(props.id, { selected: false });
                    }}
                  />
                )}
              </Group>
              <Text size="sm">
                <Group gap="xl">
                  <Group gap={4} align="center">
                    <IconClockBolt size={16} /> {recipe.time}s
                  </Group>
                  <Group gap={4} align="center">
                    <IconBuildingFactory2 size={16} /> x
                    <RepeatingNumber value={buildingsAmount} /> {building.name}
                  </Group>
                  <Group gap={4} align="center">
                    <IconBolt size={16} />{' '}
                    <RepeatingNumber
                      value={building.powerConsumption * buildingsAmount}
                    />{' '}
                    MW
                  </Group>
                </Group>
              </Text>
            </Box>
            <Table
              withColumnBorders
              style={{
                borderRight: '1px solid var(--mantine-color-dark-4)',
              }}
            >
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" fw="bold">
                      Ingredients
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {recipe.ingredients.map((ingredient, i) => (
                  <RecipeIngredientRow
                    index={i}
                    type="Ingredients"
                    recipe={recipe}
                    ingredient={ingredient}
                    key={ingredient.resource}
                    buildingsAmount={buildingsAmount}
                  />
                ))}
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" fw="bold">
                      Products
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {recipe.products.map((product, i) => (
                  <RecipeIngredientRow
                    index={i}
                    type="Products"
                    recipe={recipe}
                    ingredient={product}
                    key={product.resource}
                    buildingsAmount={buildingsAmount}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
          <Box w="250px" p="xs">
            {props.selected ? (
              <Stack gap="sm" align="flex-start">
                <Group gap="sm">
                  <Tooltip label="Ignore this recipe">
                    <ActionIcon
                      color="red"
                      variant="outline"
                      onClick={() =>
                        useStore.getState().toggleRecipe(solverId!, {
                          recipeId: recipe.id,
                          use: false,
                        })
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip
                    label={
                      nodeState?.done ? 'Remove built marker' : 'Mark as built'
                    }
                  >
                    <ActionIcon
                      color="green"
                      variant={nodeState?.done ? 'filled' : 'outline'}
                      onClick={() =>
                        useStore
                          .getState()
                          .updateSolverNode(solverId!, props.id, node => {
                            node.done = !node.done;
                          })
                      }
                    >
                      <IconCircleCheckFilled size={16} />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label="Remove recipe and replace it with an Input of the same amount.">
                    <ActionIcon
                      color="blue"
                      variant="outline"
                      onClick={() =>
                        useStore.getState().addFactoryInput(solverId!, {
                          resource: recipe.products[0].resource,
                          amount: value,
                        })
                      }
                    >
                      <FactoryInputIcon size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <SwitchRecipeAction recipeId={recipe.id} />
              </Stack>
            ) : (
              <Stack>
                <Text fs="italic" size="sm">
                  Click on the node to see available actions, like ignoring this
                  recipe or switching to an alternate recipe.
                </Text>
              </Stack>
            )}
          </Box>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
});
