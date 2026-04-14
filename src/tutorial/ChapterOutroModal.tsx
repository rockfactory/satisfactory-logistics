import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import {
  IconCircleCheckFilled,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
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
  if (!request) return null;

  const hasNext = !!request.nextChapterId;

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
          <Title order={4}>{request.chapterTitle} — done</Title>
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
              ? ` — ${request.nextChapterDescription}`
              : ''}
          </Text>
        ) : (
          <Text size="sm" c="dark.1" lh={1.55}>
            That was the last chapter — you have seen the whole tour. You can
            re-run any chapter from the help menu in the header.
          </Text>
        )}
        <Group justify="flex-end" mt="xs" gap="sm">
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
              onClick={onContinue}
            >
              Continue to {request.nextChapterTitle}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
