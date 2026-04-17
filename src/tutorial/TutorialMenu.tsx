import { ActionIcon, Group, Menu, Text, Tooltip } from '@mantine/core';
import {
  IconCircleCheckFilled,
  IconClock,
  IconHelp,
  IconPlayerPlay,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useShallowStore, useStore } from '@/core/zustand';
import { formatEstimatedMinutes, tutorialChapters } from './chapters';
import {
  hasDemoFactoriesSelector,
  removeDemoFactories,
} from './chapters/demoFactories';
import { useTutorial } from './useTutorial';

export function TutorialMenu() {
  const completed = useShallowStore(state => state.tutorial.completedChapters);
  const hasDemoFactories = useStore(hasDemoFactoriesSelector);
  const { startChapter, resetProgress } = useTutorial();

  return (
    <Menu position="bottom-end" shadow="md" width={280} withinPortal>
      <Menu.Target>
        <Tooltip label="Tutorial" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Open tutorial menu"
            data-tutorial-id="tutorial-menu"
          >
            <IconHelp size={20} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Guided tours</Menu.Label>
        {tutorialChapters.map(chapter => {
          const isDone = completed.includes(chapter.id);
          return (
            <Menu.Item
              key={chapter.id}
              leftSection={
                isDone ? (
                  <IconCircleCheckFilled
                    size={16}
                    color="var(--mantine-color-green-5)"
                  />
                ) : (
                  <IconPlayerPlay size={16} />
                )
              }
              onClick={() => {
                void startChapter(chapter.id);
              }}
            >
              <Group gap="xs" wrap="nowrap" justify="space-between">
                <Text size="sm" fw={500}>
                  {chapter.title}
                </Text>
                <Group gap={4} wrap="nowrap" c="dark.2">
                  <IconClock size={12} />
                  <Text size="xs">
                    {formatEstimatedMinutes(chapter.estimatedMinutes)}
                  </Text>
                </Group>
              </Group>
              <Text size="xs" c="dark.2">
                {chapter.description}
              </Text>
            </Menu.Item>
          );
        })}
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconRefresh size={16} />}
          onClick={() => resetProgress()}
        >
          Restart from beginning
        </Menu.Item>
        {hasDemoFactories && (
          <Menu.Item
            leftSection={
              <IconTrash size={16} color="var(--mantine-color-red-5)" />
            }
            onClick={() => removeDemoFactories()}
          >
            Remove tutorial factories
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
