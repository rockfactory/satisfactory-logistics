import { FactoryProgressStatus } from '@/factories/Factory';
import { Badge, BadgeProps } from '@mantine/core';
import { progressProperties } from '@/factories/components/progressProperties';

export const ProgressChip = ({
  status,
  ...props
}: { status?: FactoryProgressStatus } & Omit<
  BadgeProps,
  'leftSection' | 'color' | 'children'
>) => {
  if (!status) {
    return null;
  }
  const chipProps = progressProperties[status];
  if (!chipProps) {
    return null;
  }

  return (
    <Badge
      color={chipProps.color}
      leftSection={<chipProps.Icon size={12} />}
      {...props}
    >
      {chipProps.label}
    </Badge>
  );
};
