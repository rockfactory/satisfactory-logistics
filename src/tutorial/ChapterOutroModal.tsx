import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import {
  IconCircleCheckFilled,
  IconClock,
  IconPlayerPlay,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useStore } from '@/core/zustand';
import { formatEstimatedMinutes } from './chapters';
import {
  hasDemoFactoriesSelector,
  removeDemoFactories,
} from './chapters/demoFactories';
import type { OutroRequest } from './outroBus';

export interface IChapterOutroModalProps {
  opened: boolean;
  request: OutroRequest | null;
  onContinue: () => void;
  onDone: () => void;
}

export function ChapterOutroModal({
  opened,
  request,
  onContinue,
  onDone,
}: IChapterOutroModalProps) {
  const hasDemoFactories = useStore(hasDemoFactoriesSelector);

  if (!request) return null;

  const hasNext = !!request.nextChapterId;
  const showCleanup = !hasNext && hasDemoFactories;

  return (
    <Modal
      opened={opened}
      onClose={onDone}
      centered
      size="md"
      title={
        <Group gap="xs">
          <IconCircleCheckFilled
            size={20}
            color="var(--mantine-color-green-5)"
          />
          <Title order={4}>{request.chapterTitle}: done</Title>
        </Group>
      }
    >
      <Stack gap="md" pb="xs">
        {request.outroBody && (
          <Text size="sm" c="dark.1" lh={1.55}>
            {request.outroBody}
          </Text>
        )}
        {hasNext ? (
          <Text size="sm" c="dark.1" lh={1.55}>
            Up next:{' '}
            <Text span fw={600} c="gray.0">
              {request.nextChapterTitle}
            </Text>
            {request.nextChapterDescription
              ? `. ${request.nextChapterDescription}`
              : ''}
          </Text>
        ) : (
          <Text size="sm" c="dark.1" lh={1.55}>
            That was the last chapter, you have seen the whole tour. You can
            re-run any chapter from the help menu in the header.
          </Text>
        )}
        <Group justify="space-between" mt="xs" gap="sm">
          {showCleanup ? (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => removeDemoFactories()}
            >
              Remove tutorial factories
            </Button>
          ) : (
            <span />
          )}
          <Group gap="sm">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconX size={16} />}
              onClick={onDone}
            >
              I'm done for now
            </Button>
            {hasNext && (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                rightSection={
                  request.nextChapterEstimatedMinutes !== undefined ? (
                    <Group gap={4} wrap="nowrap">
                      <IconClock size={14} />
                      <Text size="xs" fw={500}>
                        {formatEstimatedMinutes(
                          request.nextChapterEstimatedMinutes,
                        )}
                      </Text>
                    </Group>
                  ) : undefined
                }
                onClick={onContinue}
              >
                Continue to {request.nextChapterTitle}
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
