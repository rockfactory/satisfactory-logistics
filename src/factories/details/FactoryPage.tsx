import { Button, Group, SegmentedControl, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FactoryDeleteButton } from '@/factories/details/FactoryDeleteButton';
import { FactoryGraph } from '@/factories/details/FactoryGraph';
import { ProductionView } from '@/factories/details/ProductionView';
import { FactoryActionsMenu } from '@/factories/list/FactoryActionsMenu';
import { useFactorySimpleAttributes } from '@/factories/store/factoriesSelectors';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { FullHeightContainer } from '@/layout/FullHeightContainer';

export const FactoryPage = ({
  currentView,
}: {
  currentView: 'calculator' | 'overview';
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    throw new Error('Factory ID is required in route params');
  }

  const factory = useFactorySimpleAttributes(id);

  return (
    <>
      <AfterHeaderSticky>
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <Button
              data-tutorial-id="back-to-factories"
              component={Link}
              to="/factories"
              variant="light"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
            >
              All Factories
            </Button>
            <Title order={4}>{factory.name}</Title>
          </Group>
          <Group gap="sm">
            <SegmentedControl
              data-tutorial-id="factory-view-switcher"
              radius="md"
              data={[
                { value: 'overview', label: 'Overview' },
                { value: 'calculator', label: 'Calculator' },
              ]}
              value={currentView}
              onChange={val => {
                if (val === 'calculator' && currentView === 'overview') {
                  navigate(`/factories/${id}/calculator`);
                }
                if (val === 'overview' && currentView === 'calculator') {
                  navigate(`/factories/${id}`);
                }
              }}
            />
            <FactoryActionsMenu factoryId={id} hideDelete />
            <FactoryDeleteButton id={id} />
          </Group>
        </Group>
      </AfterHeaderSticky>
      {currentView === 'overview' && <ProductionView id={id} />}
      {currentView === 'calculator' && (
        <FullHeightContainer>
          <FactoryGraph id={id} />
        </FullHeightContainer>
      )}
    </>
  );
};
