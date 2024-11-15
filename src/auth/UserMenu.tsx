import {
  Avatar,
  Button,
  Group,
  Menu,
  rem,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconLogin2, IconLogout } from '@tabler/icons-react';
import cx from 'clsx';
import { useState } from 'react';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { LoginModal } from './LoginModal';
import classes from './UserMenu.module.css';
import { useSession } from './authSelectors';

export interface IUserMenuProps {}

export function UserMenu(props: IUserMenuProps) {
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const session = useSession();
  const [loginOpened, loginOpenedHandler] = useDisclosure(false);
  const [loadingFactories, setLoadingFactories] = useState(false);

  const setSession = useStore(state => state.setSession);

  if (!session) {
    return (
      <>
        <Button
          rightSection={<IconLogin2 size={20} />}
          variant="subtle"
          size="sm"
          onClick={loginOpenedHandler.open}
        >
          Login
        </Button>
        <LoginModal opened={loginOpened} close={loginOpenedHandler.close} />
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
              {session.user.user_metadata.full_name ??
                session.user.user_metadata.name ??
                session.user.email}
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
            const result = await supabaseClient.auth.signOut();
            if (result.error && result.error.code === 'session_not_found') {
              setSession(null);
              return;
            }
            notifications.show({
              title: 'Logged out',
              message: 'You have been successfully logged out',
              color: 'blue',
            });
          }}
        >
          Logout
        </Menu.Item>
        {/* <Menu.Item
          leftSection={
            loadingFactories ? <Loader size={16} /> : <IconDownload size={16} />
          }
          onClick={async () => {
            setLoadingFactories(true);
            await loadFromOldRemote(useStore.getState().auth.session, true);
            setLoadingFactories(false);
          }}
        >
          Load previously saved factories
        </Menu.Item> */}
      </Menu.Dropdown>
    </Menu>
  );
}
