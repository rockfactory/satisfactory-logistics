import { Button, Divider, Group } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../core/store';
import { FactoryRow } from './FactoryRow';
import { FactoriesFiltersSection } from './filters/FactoriesFiltersSection';
import { factoryActions } from './store/FactoriesSlice';

export interface IFactoriesTabProps {}

export function FactoriesTab(_props: IFactoriesTabProps) {
  const dispatch = useDispatch();
  const factories = useSelector(
    (state: RootState) => state.factories.factories,
  );

  const filters = useSelector((state: RootState) => state.factories.filters);

  return (
    <div>
      <FactoriesFiltersSection />
      {/* <Grid columns={24}>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Factory
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Resource
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Amount
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm" fw="bold">
            Actions
          </Text>
        </Grid.Col>
      </Grid> */}
      {factories.map((factory, index) => (
        <FactoryRow key={factory.id} factory={factory} index={index} />
      ))}
      <Divider mb="lg" />
      {/* <FactoryItemInput /> */}
      <Group mt="lg">
        <Button onClick={() => dispatch(factoryActions.add({}))}>
          Add Factory
        </Button>
      </Group>
    </div>
  );
}
