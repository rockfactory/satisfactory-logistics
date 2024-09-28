import {
  Avatar,
  Button,
  Divider,
  Group,
  Loader,
  Menu,
  Modal,
  rem,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown,
  IconDownload,
  IconLogin2,
  IconLogout,
} from '@tabler/icons-react';
import cx from 'clsx';
import { useState } from 'react';
import { store } from '../core/store';
import { supabaseClient } from '../core/supabase';
import { useSession } from './AuthSlice';
import classes from './UserMenu.module.css';
import { DiscordLoginButton } from './providers/DiscordLoginButton';
import { loadFromRemote } from './sync/loadFromRemote';

export interface IUserMenuProps {}

export function UserMenu(props: IUserMenuProps) {
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const session = useSession();
  const [loginOpened, loginOpenedHandler] = useDisclosure(false);
  const [loadingFactories, setLoadingFactories] = useState(false);

  if (!session) {
    return (
      <>
        <Button
          rightSection={<IconLogin2 size={16} />}
          variant="outline"
          size="sm"
          onClick={loginOpenedHandler.open}
        >
          Login
        </Button>
        <Modal
          size="sm"
          opened={loginOpened}
          onClose={loginOpenedHandler.close}
          title="Authentication"
          // centered
        >
          <DiscordLoginButton />
          <Divider mt="xl" mb="md" />
          <Text ta="center" size="sm" c="dark.2">
            After login you can save your factories on the server, so you can
            access them from any device.
          </Text>
        </Modal>
      </>
    );
  }

  return (
    <Menu
      width={240}
      position="bottom-end"
      transitionProps={{ transition: 'pop-top-right' }}
      onClose={() => setUserMenuOpened(false)}
      onOpen={() => setUserMenuOpened(true)}
      withinPortal
    >
      <Menu.Target>
        <UnstyledButton
          className={cx(classes.user, {
            [classes.userActive]: userMenuOpened,
          })}
        >
          <Group gap={7}>
            <Avatar src={session.user.user_metadata.avatar_url} size={32} />
            <Text fw={500} size="sm" lh={1} mr={3}>
              {session.user.user_metadata.name ?? session.user.email}
            </Text>
            <IconChevronDown
              style={{ width: rem(12), height: rem(12) }}
              stroke={1.5}
            />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconLogout size={16} />}
          onClick={async () => {
            await supabaseClient.auth.signOut();
          }}
        >
          Logout
        </Menu.Item>
        <Menu.Item
          leftSection={
            loadingFactories ? <Loader size={16} /> : <IconDownload size={16} />
          }
          onClick={async () => {
            setLoadingFactories(true);
            await loadFromRemote(store.getState().auth.session, true);
            setLoadingFactories(false);
          }}
        >
          Load saved factories
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
