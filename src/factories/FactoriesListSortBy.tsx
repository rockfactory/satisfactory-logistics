import { useUiStore } from '@/core/zustand';
import { Group, Select } from '@mantine/core';
import { IconArrowsDownUp } from '@tabler/icons-react';

const NO_ORDER = '__NO_ORDER';

export const FactoriesListSortBy = () => {
  const { sortBy } = useUiStore(state => state.factoryView);

  return (
    <Select
      size="xs"
      variant="filled"
      leftSection={
        <IconArrowsDownUp
          stroke={2}
          size={14}
          color="var(--mantine-color-white)"
        />
      }
      data={[
        {
          value: 'name',
          label: 'Name',
        },
        {
          value: NO_ORDER,
          label: 'Unspecified',
        },
      ]}
      color={'white'}
      value={sortBy ?? NO_ORDER}
      onChange={value => {
        useUiStore
          .getState()
          .sortFactoriesBy(value === NO_ORDER ? undefined : value);
      }}
    />
  );
};
