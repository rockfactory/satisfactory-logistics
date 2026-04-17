import { Box, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import type { ReactNode, Ref } from 'react';
import type { Section } from './settingsSections';

interface SettingSectionCardProps {
  section: Section;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function SettingSectionCard({
  section,
  children,
  ref,
}: SettingSectionCardProps) {
  const Icon = section.icon;
  return (
    <Card
      ref={ref}
      radius="md"
      padding="md"
      bg="dark.6"
      id={`game-settings-section-${section.id}`}
      data-settings-section={section.id}
      style={{ border: '1px solid var(--mantine-color-dark-5)' }}
    >
      <Group gap="sm" mb="md">
        <ThemeIcon variant="light" color={section.color} size="lg" radius="md">
          <Icon size={18} />
        </ThemeIcon>
        <Box>
          <Text fw={600} size="sm">
            {section.label}
          </Text>
          <Text size="xs" c="dimmed">
            {section.description}
          </Text>
        </Box>
      </Group>
      <Stack gap="sm">{children}</Stack>
    </Card>
  );
}
