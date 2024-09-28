import { Button, Divider, Group, Stack } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../core/store';
import { FactoriesFiltersSection } from '../filters/FactoriesFiltersSection';
import { factoryActions } from '../store/FactoriesSlice';
import { FactoryWideCard } from './FactoryWideCard';

export interface IFactoriesWideTabProps {}

export function FactoriesWideTab(_props: IFactoriesWideTabProps) {
  const dispatch = useDispatch();
  const factories = useSelector(
    (state: RootState) => state.factories.factories,
  );

  const filters = useSelector((state: RootState) => state.factories.filters);

  return (
    <div>
      <FactoriesFiltersSection />
      <Stack gap="md">
        {factories.map((factory, index) => (
          <FactoryWideCard key={factory.id} factory={factory} index={index} />
        ))}
      </Stack>
      <Divider mb="lg" />
      <Group mt="lg">
        <Button onClick={() => dispatch(factoryActions.add({}))}>
          Add Factory
        </Button>
      </Group>
    </div>
  );
}
