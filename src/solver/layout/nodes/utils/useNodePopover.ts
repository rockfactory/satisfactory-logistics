import { useDisclosure, useFocusWithin } from '@mantine/hooks';

/**
 * Manages popover open state for solver graph nodes, preventing
 * the popover from flashing closed on touch devices (iPad) when
 * tapping an input inside the dropdown triggers a virtual keyboard
 * that momentarily deselects the React Flow node.
 *
 * While focus is inside the popover dropdown, the popover stays open
 * regardless of transient `selected` state changes.
 */
export function useNodePopover(selected: boolean, dragging: boolean) {
  const [isHovering, { close: hoverClose, open: hoverOpen }] =
    useDisclosure(false);
  const { ref: dropdownRef, focused: dropdownFocused } = useFocusWithin();

  const opened = (isHovering || selected || dropdownFocused) && !dragging;

  return {
    opened,
    hoverOpen,
    hoverClose,
    dropdownRef,
  };
}
