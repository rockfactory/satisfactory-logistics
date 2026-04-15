import { Box, Group, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import type { Section } from './settingsSections';

interface SettingSectionNavButtonProps {
  section: Section;
  active: boolean;
  onClick: () => void;
}

export function SettingSectionNavButton({
  section,
  active,
  onClick,
}: SettingSectionNavButtonProps) {
  const Icon = section.icon;
  return (
    <UnstyledButton
      onClick={onClick}
      p="xs"
      style={{
        borderRadius: 8,
        background: active ? 'var(--mantine-color-dark-5)' : 'transparent',
        transition: 'background 120ms ease',
      }}
      styles={{
        root: {
          '&:hover': {
            background: active
              ? 'var(--mantine-color-dark-5)'
              : 'var(--mantine-color-dark-6)',
          },
        },
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon
          variant={active ? 'filled' : 'light'}
          color={section.color}
          size="md"
          radius="sm"
        >
          <Icon size={16} />
        </ThemeIcon>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={600} c={active ? 'white' : 'gray.3'} truncate>
            {section.label}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {section.description}
          </Text>
        </Box>
      </Group>
    </UnstyledButton>
  );
}
