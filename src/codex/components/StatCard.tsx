import { Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'gray',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Paper withBorder p="sm" radius="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {icon && (
          <ThemeIcon variant="light" color={color} size="lg" radius="md">
            {icon}
          </ThemeIcon>
        )}
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lh={1.2}>
            {label}
          </Text>
          <Text fw={700} size="lg" lh={1.2}>
            {value}
          </Text>
          {sub && (
            <Text size="xs" c="dimmed" lh={1.2}>
              {sub}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder p="md" radius="sm">
      <Stack gap="sm">
        <Text fw={700} size="sm" tt="uppercase" c="dimmed">
          {title}
        </Text>
        {children}
      </Stack>
    </Paper>
  );
}
