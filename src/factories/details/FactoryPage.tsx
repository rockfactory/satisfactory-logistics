import { Button, Group, SegmentedControl, Title } from '@mantine/core';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFactorySimpleAttributes } from '@/factories/store/factoriesSelectors.ts';
import { IconArrowLeft } from '@tabler/icons-react';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal.tsx';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky.tsx';
import { FactoryDeleteButton } from '@/factories/details/FactoryDeleteButton.tsx';
import { ProductionView } from '@/factories/details/ProductionView.tsx';
import { FactoryGraph } from '@/factories/details/FactoryGraph.tsx';

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
      {currentView === 'calculator' && <FactoryGraph id={id} />}
    </>
  );
};
