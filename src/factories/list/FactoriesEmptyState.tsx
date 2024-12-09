import { useStore } from '@/core/zustand';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Divider, Stack, Text } from '@mantine/core';
import {
  IconBuildingFactory,
  IconDeviceGamepad,
  IconPlus,
} from '@tabler/icons-react';
import { v4 } from 'uuid';
import classes from '@/factories/FactoriesTab.module.css';

export const FactoriesEmptyState = () => {
  const gameId = useStore(state => state.games.selected);
  const navigate = useNavigate();

  return (
    <Stack gap="xs" align="center" mih={200} mt={60} mb={90}>
      <IconBuildingFactory size={64} stroke={1.2} />
      <Text fz="h2">Let's build some factories!</Text>
      <Text size="sm" c="dark.2">
        Add factories to start planning your logistics.
      </Text>
      <Button
        leftSection={<IconPlus size={16} />}
        mt="lg"
        size="lg"
        onClick={() => {
          if (!gameId) {
            throw new Error('This technically should not be possible');
          }
          const factoryId = v4();

          useStore.getState().addGameFactory(factoryId, gameId);

          navigate(factoryId);
        }}
      >
        Add first factory
      </Button>

      <Divider
        w="60%"
        mt="lg"
        mb="lg"
        classNames={{ label: classes.emptyDividerLabel }}
        label="Do you want to import your factories from this or another tool?"
      />
      <Button
        component={Link}
        variant="light"
        size="lg"
        leftSection={<IconDeviceGamepad size={16} stroke={2} />}
        to="/games"
      >
        Import and Manage Games
      </Button>
    </Stack>
  );
};
