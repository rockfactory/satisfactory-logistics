import {
  Badge,
  Box,
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
} from '@tabler/icons-react';
import { NodeProps } from '@xyflow/react';
import React, { memo } from 'react';
import { RepeatingNumber } from '../../../core/intl/NumberFormatter';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '../../../factories/components/peek/icons/OutputInputIcons';
import { AllFactoryBuildingsMap } from '../../FactoryBuilding';
import { AllFactoryItemsMap } from '../../FactoryItem';
import { FactoryRecipe, RecipeIngredient } from '../../FactoryRecipe';
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
  const { recipe } = props.data;
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const isAlt = recipe.name.includes('Alternate');

  const buildingsAmount =
    props.data.value / recipe.products[0].amount / recipe.time;

  const [isHovering, { close, open }] = useDisclosure(false);

  return (
    <Popover
      opened={isHovering && !props.dragging}
      transitionProps={{
        enterDelay: 250,
      }}
    >
      <Popover.Target>
        <Box
          p="sm"
          style={{ borderRadius: 4 }}
          bg="dark.4"
          onMouseEnter={open}
          onMouseLeave={close}
        >
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
                <RepeatingNumber value={buildingsAmount} /> {building.name}
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
              />
            ))}
          </Table>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
});

const RecipeIngredientRow = ({
  index,
  type,
  recipe,
  ingredient,
}: {
  index: number;
  type: 'Ingredients' | 'Products';
  recipe: FactoryRecipe;
  ingredient: RecipeIngredient;
}) => {
  const item = AllFactoryItemsMap[ingredient.resource];
  const amountPerMinute = (ingredient.amount * 60) / recipe.time;
  return (
    <Table.Tr>
      {index === 0 && (
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
      )}
      <Table.Td>
        <Image w="24" h="24" src={item.imagePath} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.displayName}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          <RepeatingNumber value={ingredient.amount} />
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          <RepeatingNumber value={amountPerMinute} />
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
