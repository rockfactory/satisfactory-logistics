import { ReactNode } from 'react';
import { Group, Text } from '@mantine/core';

export const FactoriesListHeader = ({
  factoriesShown,
  factoriesTotal,
  rightSide,
}: {
  factoriesShown: number;
  factoriesTotal: number;
  rightSide: ReactNode;
}) => {
  return (
    <Group justify="space-between" align="center" h="36px">
      <Text
        size="xs"
        fw="bold"
        c={factoriesShown !== factoriesTotal ? 'orange' : 'dimmed'}
      >
        {factoriesShown} / {factoriesTotal} factories filtered
      </Text>
      {rightSide}
    </Group>
  );
};
