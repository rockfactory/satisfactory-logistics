import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
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
  IconClockBolt,
  IconTrash,
} from '@tabler/icons-react';
import { NodeProps, NodeToolbar } from '@xyflow/react';
import React, { memo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RepeatingNumber } from '../../../core/intl/NumberFormatter';
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

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);
  const buildingsAmount = value / perBuilding;

  const [isHovering, { close, open }] = useDisclosure(false);

  const dispatch = useDispatch();
  const solverId = useParams<{ id: string }>().id;

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
          bg="dark.4"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <NodeToolbar>
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
          </NodeToolbar>

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
      <Popover.Dropdown>
        <Title order={5}>{getRecipeDisplayName(recipe)}</Title>
        <Divider mt="sm" mb="sm" />
        <Group align="flex-start">
          <Stack gap="sm">
            <Text size="sm">
              <Group gap="sm" justify="space-between">
                <div>
                  <IconClockBolt size={16} /> {recipe.time}s
                </div>
                <div>
                  <IconBuildingFactory2 size={16} />{' '}
                  <RepeatingNumber value={buildingsAmount} /> {building.name}
                </div>
                <div>
                  <IconBolt size={16} />{' '}
                  <RepeatingNumber
                    value={building.powerConsumption * buildingsAmount}
                  />{' '}
                  MW
                </div>
              </Group>
            </Text>
            <Table withColumnBorders>
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
          {props.selected && (
            <Stack gap="sm" align="flex-start">
              <Button
                color="red"
                variant="outline"
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
              <SwitchRecipeAction recipeId={recipe.id} />
            </Stack>
          )}
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
