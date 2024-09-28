import { Button, Divider, Group } from '@mantine/core';
import { useDispatch } from 'react-redux';
import { FactoryRow } from './FactoryRow';
import { FactoriesFiltersSection } from './filters/FactoriesFiltersSection';
import { ImportFactoriesModal } from './import/ImportFactoriesModal';
import { factoryActions, useFactories } from './store/FactoriesSlice';
import { FactoryUndoButtons } from './store/FactoryUndoButtons';

export interface IFactoriesTabProps {}

export function FactoriesTab(_props: IFactoriesTabProps) {
  const dispatch = useDispatch();
  const factories = useFactories();

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
        <ImportFactoriesModal />
        <FactoryUndoButtons />
      </Group>
    </div>
  );
}
