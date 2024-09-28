import {
  Button,
  Group,
  Menu,
  Modal,
  rem,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconHeart, IconLogin2 } from '@tabler/icons-react';
import cx from 'clsx';
import { useState } from 'react';
import { supabaseClient } from '../core/supabase';
import { useSession } from './AuthSlice';
import classes from './UserMenu.module.css';
import { DiscordLoginButton } from './providers/DiscordLoginButton';

export interface IUserMenuProps {}

export function UserMenu(props: IUserMenuProps) {
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const session = useSession();
  const [loginOpened, loginOpenedHandler] = useDisclosure(false);

  if (!session) {
    return (
      <>
        <Button
          rightSection={<IconLogin2 size={16} />}
          variant="default"
          onClick={loginOpenedHandler.open}
        >
          Login
        </Button>
        <Modal
          opened={loginOpened}
          onClose={loginOpenedHandler.close}
          title="Login"
        >
          <DiscordLoginButton />
        </Modal>
      </>
    );
  }

  return (
    <Menu
      width={260}
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
            <Text fw={500} size="sm" lh={1} mr={3}>
              {session.user.email}
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
          onClick={async () => {
            await supabaseClient.auth.signOut();
          }}
        >
          Logout
        </Menu.Item>
        <Menu.Item
          leftSection={
            <IconHeart
              style={{ width: rem(16), height: rem(16) }}
              color="red.6"
              stroke={1.5}
            />
          }
        >
          Liked posts
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
