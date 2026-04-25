import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconClipboardCopy,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconExternalLink,
  IconTrash,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { camelCase } from 'lodash';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { confirmDeleteFactory } from '@/factories/details/confirmDeleteFactory';
import { serializeFactory } from '@/games/store/gameFactoriesActions';

export interface IFactoryActionsMenuProps {
  factoryId: string;
  /**
   * Optional custom trigger. Defaults to a kebab `ActionIcon`. The trigger
   * is rendered inside `Menu.Target` so consumers can pass any node.
   */
  trigger?: ReactNode;
  /**
   * Suppress the Delete entry. Used on the detail page where a dedicated
   * Delete button with a polished confirmation modal is already present.
   */
  hideDelete?: boolean;
  /**
   * Show an "Open factory" entry that links to the factory detail page.
   * Useful in list contexts (grid/row) so the menu replaces the implicit
   * card-click action with an explicit, discoverable one. Off by default
   * because the detail page already is the open destination.
   */
  showOpen?: boolean;
}

/**
 * Per-factory actions: Duplicate, Export, Copy to clipboard, Delete. Used
 * in both grid card and row layouts. Buttons stop event propagation so the
 * menu can be embedded inside a clickable card link without triggering
 * navigation.
 */
export function FactoryActionsMenu(props: IFactoryActionsMenuProps) {
  const { factoryId, trigger, hideDelete, showOpen } = props;
  const factoryName = useStore(
    state => state.factories.factories[factoryId]?.name ?? '',
  );

  const handleDuplicate = () => {
    useStore.getState().cloneGameFactory(factoryId);
  };

  const handleExport = () => {
    try {
      const payload = serializeFactory(factoryId);
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SatisfactoryLogistics_Factory_${camelCase(factoryName) || 'factory'}_${dayjs().format('YYYY_MM_DD[T]HH_mm_ss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Failed to export factory',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    }
  };

  const handleCopy = async () => {
    try {
      const payload = serializeFactory(factoryId);
      await navigator.clipboard.writeText(JSON.stringify(payload));
      notifications.show({
        title: 'Factory copied',
        message: factoryName
          ? `"${factoryName}" was copied to the clipboard.`
          : 'The factory was copied to the clipboard.',
        color: 'green',
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Failed to copy factory',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    }
  };

  const handleDelete = () => {
    confirmDeleteFactory(factoryId);
  };

  const stop = <
    T extends { stopPropagation: () => void; preventDefault: () => void },
  >(
    e: T,
  ) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // Note: do NOT add onClick={stop} on the trigger ActionIcon. Mantine's
  // `Menu.Target` clones the child to attach its open-toggle on the bubble
  // phase; stopPropagation on the inner ActionIcon would prevent that
  // cloned handler from firing and the menu would never open. To keep the
  // surrounding clickable card (e.g. the grid card's `<Link>`) from
  // navigating, the consumer wraps this menu in a stop-propagation
  // wrapper.
  const defaultTrigger = (
    <Tooltip label="Factory actions" position="top">
      <ActionIcon
        data-tutorial-id="factory-actions-menu"
        variant="subtle"
        color="gray"
        size="lg"
        aria-label="Factory actions"
      >
        <IconDotsVertical stroke={2} size={16} />
      </ActionIcon>
    </Tooltip>
  );

  return (
    <Menu
      shadow="md"
      width={220}
      position="bottom-end"
      withinPortal
      closeOnItemClick
    >
      <Menu.Target>{trigger ?? defaultTrigger}</Menu.Target>
      <Menu.Dropdown onClick={stop} onMouseDown={stop}>
        {showOpen && (
          <>
            <Menu.Item
              data-tutorial-id="factory-actions-open"
              component={Link}
              to={`/factories/${factoryId}`}
              leftSection={<IconExternalLink size={16} stroke={1.5} />}
            >
              Open factory
            </Menu.Item>
            <Menu.Divider />
          </>
        )}
        <Menu.Item
          data-tutorial-id="factory-actions-duplicate"
          leftSection={<IconCopy size={16} stroke={1.5} />}
          onClick={e => {
            stop(e);
            handleDuplicate();
          }}
        >
          Duplicate
        </Menu.Item>
        <Menu.Item
          data-tutorial-id="factory-actions-export"
          leftSection={<IconDownload size={16} stroke={1.5} />}
          onClick={e => {
            stop(e);
            handleExport();
          }}
        >
          Export as file
        </Menu.Item>
        <Menu.Item
          data-tutorial-id="factory-actions-copy"
          leftSection={<IconClipboardCopy size={16} stroke={1.5} />}
          onClick={e => {
            stop(e);
            handleCopy().catch(console.error);
          }}
        >
          Copy to clipboard
        </Menu.Item>
        {!hideDelete && (
          <>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} stroke={1.5} />}
              onClick={e => {
                stop(e);
                handleDelete();
              }}
            >
              Delete
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
