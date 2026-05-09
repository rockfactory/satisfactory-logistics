import {
  ActionIcon,
  type ActionIconProps,
  Image,
  type MantineSize,
} from '@mantine/core';
import { forwardRef } from 'react';

export interface IDepotToggleButtonProps {
  active: boolean;
  /**
   * When provided, the button is interactive and toggles on click.
   * When omitted, it renders as a static visual example.
   */
  onToggle?: () => void;
  size?: MantineSize | (string & {}) | number;
  'data-tutorial-id'?: string;
}

const ACTIVE_LABEL = 'Uploaded to Dimensional Depot';
const INACTIVE_LABEL = 'Mark output as uploaded to Dimensional Depot';

/**
 * Toggle button shared between the factory output row and the Dimensional
 * Depot tab's how-to hint. Renders the Mercer Sphere icon, dimmed and
 * grayscaled when inactive, fully colored when active.
 *
 * Forwards refs so Mantine `Tooltip` can wrap it directly.
 */
export const DepotToggleButton = forwardRef<
  HTMLButtonElement,
  IDepotToggleButtonProps
>(function DepotToggleButton(props, ref) {
  const { active, onToggle, size = 'md' } = props;
  const isInteractive = onToggle != null;

  const variant: ActionIconProps['variant'] = active ? 'filled' : 'default';
  const color = active ? 'grape' : 'gray';

  return (
    <ActionIcon
      ref={ref}
      data-tutorial-id={props['data-tutorial-id']}
      component={isInteractive ? 'button' : 'span'}
      size={size}
      radius="sm"
      variant={variant}
      color={color}
      aria-label={active ? ACTIVE_LABEL : INACTIVE_LABEL}
      aria-hidden={!isInteractive || undefined}
      style={
        isInteractive ? undefined : { cursor: 'default', pointerEvents: 'none' }
      }
      onClick={onToggle}
    >
      <Image
        src="/images/game/wat-2_256.png"
        alt="Mercer Sphere"
        w={16}
        h={16}
        style={active ? undefined : { filter: 'grayscale(1) opacity(0.55)' }}
      />
    </ActionIcon>
  );
});
