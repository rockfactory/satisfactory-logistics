import {
  alpha,
  Badge,
  Box,
  CloseButton,
  getGradient,
  Group,
  Image,
  Popover,
  Stack,
  Table,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBolt,
  IconBuildingFactory2,
  IconCircleCheckFilled,
  IconClockBolt,
} from '@tabler/icons-react';
import { NodeProps, useReactFlow } from '@xyflow/react';
import { memo } from 'react';
import { useParams } from 'react-router-dom';

import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { RepeatingNumber } from '../../../../core/intl/NumberFormatter';
import { useStore } from '../../../../core/zustand';
import { AllFactoryBuildingsMap } from '../../../../recipes/FactoryBuilding';
import {
  AllFactoryItemsMap,
  type FactoryItem,
} from '../../../../recipes/FactoryItem';
import {
  FactoryRecipe,
  getRecipeDisplayName,
  getRecipeProductPerBuilding,
} from '../../../../recipes/FactoryRecipe';
import { InvisibleHandles } from '../../rendering/InvisibleHandles';
import { MachineNodeActions } from './MachineNodeActions';
import { RecipeIngredientRow } from './RecipeIngredientRow';

export interface IMachineNodeData {
  label: string;
  value: number;
  originalValue: number;
  amplifiedValue: number;
  recipe: FactoryRecipe;
  resource: FactoryItem;
  [key: string]: unknown;
}

export type IMachineNodeProps = NodeProps & {
  data: IMachineNodeData;
  type: 'Machine';
};

export const MachineNode = memo((props: IMachineNodeProps) => {
  const { recipe, value, originalValue, amplifiedValue } = props.data;

  const theme = useMantineTheme();

  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const isAlt = recipe.name.includes('Alternate');
  const { updateNode } = useReactFlow();

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);

  const [isHovering, { close, open }] = useDisclosure(false);

  const solverId = useParams<{ id: string }>().id;

  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );
  const overclock = nodeState?.overclock ?? 1;
  const buildingsAmount = originalValue / perBuilding / overclock;
  const amplifiedRate = (amplifiedValue + originalValue) / originalValue;

  return (
    <Popover
      opened={(isHovering || props.selected) && !props.dragging}
      transitionProps={{}}
      offset={4}
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
          bg={nodeState?.done ? '#304d3e' : 'dark.4'}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Box
            pos="absolute"
            left={-8}
            top={-8}
            style={{ borderRadius: '3px' }}
            bg={alpha(
              nodeState?.done ? '#304d3e' : 'var(--mantine-color-dark-4)',
              0.7,
            )}
          >
            <Group gap={2}>
              {nodeState?.done && (
                <IconCircleCheckFilled
                  size={16}
                  color="var(--mantine-color-green-5)"
                />
              )}
              {overclock > 1.0 && (
                <Box p={2} style={{ borderRadius: 16 }}>
                  <FactoryItemImage
                    size={14}
                    id={'Desc_CrystalShard_C' as FactoryItemId}
                  />
                </Box>
              )}
              {amplifiedRate > 1 && (
                <Box p={2} style={{ borderRadius: 16 }}>
                  <FactoryItemImage
                    size={14}
                    id={'Desc_WAT1_C' as FactoryItemId}
                  />
                </Box>
              )}
            </Group>
          </Box>

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
            <Box pos="relative" p="0">
              <Image w="32" h="32" src={building.imagePath} />
            </Box>
            <Stack gap={2} align="center">
              <Group gap={2}>
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
            <Box
              pos="relative"
              p={6}
              m={-6}
              style={{
                borderRadius: '3px',
              }}
              bg={
                nodeState?.somersloops
                  ? getGradient(
                      { deg: 180, from: 'grape.5', to: 'pink.6' },
                      theme,
                    )
                  : 'transparent'
              }
            >
              <FactoryItemImage id={product.id} size={32} highRes />
            </Box>
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
                  <Table.Td colSpan={3}>
                    <Text size="sm" fw="bold">
                      Ingredients
                    </Text>
                  </Table.Td>
                  <Table.Td colSpan={2}>
                    <Group align="center" gap={2}>
                      <FactoryItemImage
                        id={'Desc_CrystalShard_C' as FactoryItemId}
                        size={16}
                      />{' '}
                      <Text size="sm" fw={overclock != 1 ? 'bold' : 'normal'}>
                        {PercentageFormatter.format(overclock)}
                      </Text>
                    </Group>
                  </Table.Td>
                  {amplifiedRate > 1 && (
                    <Table.Td colSpan={2}>
                      <Group gap={2} align="center">
                        <FactoryItemImage
                          id={'Desc_WAT1_C' as FactoryItemId}
                          size={16}
                        />{' '}
                        <Text size="sm" fw="bold" c="grape.4">
                          {PercentageFormatter.format(amplifiedRate)}
                        </Text>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
                {recipe.ingredients.map((ingredient, i) => (
                  <RecipeIngredientRow
                    index={i}
                    type="Ingredients"
                    recipe={recipe}
                    ingredient={ingredient}
                    key={ingredient.resource}
                    buildingsAmount={buildingsAmount}
                    overclock={overclock}
                    amplifiedRate={amplifiedRate}
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
                    overclock={overclock}
                    amplifiedRate={amplifiedRate}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
          <Box w="250px" p="xs">
            {props.selected ? (
              <MachineNodeActions
                data={props.data}
                id={props.id}
                buildingsAmount={buildingsAmount}
              />
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
