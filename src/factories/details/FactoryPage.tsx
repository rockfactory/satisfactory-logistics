import { Button, Group, SegmentedControl, Title } from '@mantine/core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFactorySimpleAttributes } from '@/factories/store/factoriesSelectors';
import { IconArrowLeft } from '@tabler/icons-react';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { FactoryDeleteButton } from '@/factories/details/FactoryDeleteButton';
import { ProductionView } from '@/factories/details/ProductionView';
import { FactoryGraph } from '@/factories/details/FactoryGraph';
import { FullHeightContainer } from '@/layout/FullHeightContainer';

export const FactoryPage = ({
  currentView,
}: {
  currentView: 'calculator' | 'overview';
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    throw new Error();
  }

  const factory = useFactorySimpleAttributes(id);

  return (
    <>
      <AfterHeaderSticky>
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <Button
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
              data={[
                { value: 'overview', label: 'Overview' },
                { value: 'calculator', label: 'Calculator' },
              ]}
              value={currentView}
              onChange={val => {
                if (val === 'calculator' && currentView === 'overview') {
                  navigate(`../${id}/calculator`);
                }
                if (val === 'overview' && currentView === 'calculator') {
                  navigate(`../${id}`);
                }
              }}
            />
            <GameSettingsModal />
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
