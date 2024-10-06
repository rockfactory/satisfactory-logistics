import {
  Badge,
  Box,
  Button,
  CloseButton,
  Grid,
  Group,
  Image,
  Popover,
  Stack,
  Table,
  Text,
  Title,
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
import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RepeatingNumber } from '../../../core/intl/NumberFormatter';
import { RootState } from '../../../core/store';
import { AllFactoryBuildingsMap } from '../../FactoryBuilding';
import { AllFactoryItemsMap } from '../../FactoryItem';
import {
  FactoryRecipe,
  getRecipeProductPerBuilding,
  RecipeIngredient,
} from '../../FactoryRecipe';
import { SwitchRecipeAction } from '../page/actions/SwitchRecipeAction';
import { solverActions } from '../store/SolverSlice';
import { InvisibleHandles } from './InvisibleHandles';

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

export function getRecipeDisplayName(recipe: FactoryRecipe) {
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const isAlt = recipe.name.includes('Alternate');
  return isAlt ? recipe.name.replace('Alternate: ', '') : product.displayName;
}

export const MachineNode = memo((props: IMachineNodeProps) => {
  const { recipe, value } = props.data;
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const isAlt = recipe.name.includes('Alternate');
  const { updateNode } = useReactFlow();

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);
  const buildingsAmount = value / perBuilding;

  const [isHovering, { close, open }] = useDisclosure(false);

  const dispatch = useDispatch();
  const solverId = useParams<{ id: string }>().id;

  const nodeState = useSelector(
    (state: RootState) =>
      state.solver.present.instances[solverId ?? '']?.nodes?.[props.id],
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
            <Image w="32" h="32" src={product.imagePath} />
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
                <Button
                  color="red"
                  variant="outline"
                  leftSection={<IconTrash size={16} />}
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
                  Ignore this recipe
                </Button>
                <Button
                  color="green"
                  variant="outline"
                  leftSection={<IconCircleCheckFilled size={16} />}
                  onClick={() =>
                    dispatch(
                      solverActions.updateAtPath({
                        id: solverId,
                        path: `nodes.${props.id}.done`,
                        value: nodeState?.done ? false : true,
                      }),
                    )
                  }
                >
                  Mark as built
                </Button>
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

const RecipeIngredientRow = ({
  index,
  type,
  recipe,
  ingredient,
  buildingsAmount,
}: {
  index: number;
  type: 'Ingredients' | 'Products';
  recipe: FactoryRecipe;
  ingredient: RecipeIngredient;
  buildingsAmount: number;
}) => {
  const item = AllFactoryItemsMap[ingredient.resource];
  const amountPerMinute = (ingredient.displayAmount * 60) / recipe.time;
  return (
    <Table.Tr>
      {/* {index === 0 && (
        <Table.Td
          rowSpan={
            type === 'Ingredients'
              ? recipe.ingredients.length
              : recipe.products.length
          }
        >
          {type === 'Ingredients' ? (
            <FactoryInputIcon size={16} />
          ) : (
            <FactoryOutputIcon size={16} />
          )}
        </Table.Td>
      )} */}
      <Table.Td>
        <Image w="24" h="24" src={item.imagePath} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.displayName}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fs="italic">
          <RepeatingNumber value={ingredient.displayAmount} />
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fs="italic">
          <RepeatingNumber value={amountPerMinute} />
          /min
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw="bold">
          <RepeatingNumber value={amountPerMinute * buildingsAmount} />
          /min
        </Text>
      </Table.Td>
    </Table.Tr>
  );
};

const DetailRow = ({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) => (
  <Grid>
    <Grid.Col span={6}>
      <Text size="sm" fw="bold">
        {label}
      </Text>
    </Grid.Col>
    <Grid.Col span={6}>
      <Text size="sm" ta="right">
        {value}
      </Text>
    </Grid.Col>
  </Grid>
);
