import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { Stack, Table, Text, Tooltip } from '@mantine/core';
import * as React from 'react';
import { AllFactoryItemsMap } from '../FactoryItem';
import { AllFactoryRecipesMap } from '../FactoryRecipe';
import { FactoryItemImage } from './FactoryItemImage';

export interface IRecipeTooltipProps {
  recipeId: string;
  children: React.ReactNode;
}

export function RecipeTooltip(props: IRecipeTooltipProps) {
  const recipe = AllFactoryRecipesMap[props.recipeId];
  return (
    <Tooltip
      color="dark.8"
      keepMounted={false}
      label={
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {recipe.name}
          </Text>
          <Table withColumnBorders verticalSpacing={3} cellPadding={4}>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td colSpan={3} fw="bold">
                  Ingredients
                </Table.Td>
              </Table.Tr>
              {recipe.ingredients.map(ingredient => (
                <Table.Tr key={ingredient.resource}>
                  <Table.Td width={20}>
                    <FactoryItemImage size={16} id={ingredient.resource} />
                  </Table.Td>
                  <Table.Td>
                    {AllFactoryItemsMap[ingredient.resource].displayName}
                  </Table.Td>
                  <Table.Td>
                    <RepeatingNumber
                      value={(ingredient.displayAmount * 60) / recipe.time}
                    />
                    /min
                  </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr>
                <Table.Td colSpan={3} fw="bold">
                  Products
                </Table.Td>
              </Table.Tr>
              {recipe.products.map(product => (
                <Table.Tr key={product.resource}>
                  <Table.Td width={20}>
                    <FactoryItemImage size={16} id={product.resource} />
                  </Table.Td>
                  <Table.Td>
                    {AllFactoryItemsMap[product.resource].displayName}
                  </Table.Td>
                  <Table.Td>
                    <RepeatingNumber
                      value={(product.amount * 60) / recipe.time}
                    />
                    /min
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      }
    >
      {props.children}
    </Tooltip>
  );
}
