import { NumberInput, Table, Text } from '@mantine/core';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import type { FactoryRecipe, RecipeIngredient } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { roundOverclock } from './roundOverclock';

export const RecipeIngredientRow = ({
  index,
  type,
  recipe,
  ingredient,
  buildingsAmount,
  overclock,
  amplifiedRate,
  editable,
  onOverclockChange,
}: {
  index: number;
  type: 'Ingredients' | 'Products';
  recipe: FactoryRecipe;
  ingredient: RecipeIngredient;
  buildingsAmount: number;
  overclock: number;
  amplifiedRate: number;
  editable?: boolean;
  onOverclockChange?: (overclock: number | string) => void;
}) => {
  const item = AllFactoryItemsMap[ingredient.resource];
  const baseRate = (ingredient.displayAmount * 60) / recipe.time;
  const amountPerMinute = baseRate * overclock;
  return (
    <Table.Tr>
      <Table.Td>
        <FactoryItemImage size={16} id={item.id} />
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
        {editable && onOverclockChange ? (
          <NumberInput
            size="xs"
            variant="filled"
            suffix="/min"
            value={Math.round(amountPerMinute * 1000) / 1000}
            onValueChange={({ floatValue }) => {
              if (floatValue == null || floatValue <= 0) return;
              const newOverclock = roundOverclock(floatValue / baseRate);
              onOverclockChange(newOverclock);
            }}
            min={0}
            allowNegative={false}
            decimalScale={3}
            w={110}
            styles={{
              input: {
                fontStyle: 'italic',
                fontSize: 'var(--mantine-font-size-sm)',
              },
            }}
          />
        ) : (
          <Text size="sm" fs="italic">
            <RepeatingNumber value={amountPerMinute} />
            /min
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw="bold">
          <RepeatingNumber value={amountPerMinute * buildingsAmount} />
          /min
        </Text>
      </Table.Td>
      {amplifiedRate > 1 && (
        <Table.Td>
          {type === 'Products' && (
            <Text size="sm" fw="bold" c="grape.4">
              <RepeatingNumber
                value={amplifiedRate * amountPerMinute * buildingsAmount}
              />
              /min
            </Text>
          )}
        </Table.Td>
      )}
    </Table.Tr>
  );
};
