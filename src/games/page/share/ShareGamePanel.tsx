import { useStore } from '@/core/zustand';
import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconShare } from '@tabler/icons-react';
import { useState } from 'react';
import { shareGame } from './shareGame';

export interface IShareGamePanelProps {
  gameId: string;
}

export function ShareGamePanel(props: IShareGamePanelProps) {
  const [loading, setLoading] = useState(false);
  const savedId = useStore(state => state.games.games[props.gameId].savedId);
  const token = useStore(state => state.games.games[props.gameId].shareToken);
  const sharedUrl = token
    ? `${window.location.origin}/games/shared?gameSavedId=${savedId}&token=${encodeURIComponent(token)}`
    : null;

  // TODO COnfirm old link will stop working
  const handleShare = async () => {
    setLoading(true);
    try {
      await shareGame(props.gameId);
    } catch (error: any) {
      console.error('Error sharing game:', error);
      notifications.show({
        title: 'Error sharing game',
        message: error?.message ?? error ?? 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {token && sharedUrl && (
        <Group>
          <TextInput
            value={sharedUrl}
            w="100%"
            readOnly
            rightSection={
              <CopyButton value={sharedUrl} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip
                    label={copied ? 'Copied' : 'Copy'}
                    withArrow
                    position="right"
                  >
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="subtle"
                      onClick={copy}
                    >
                      {copied ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />
        </Group>
      )}
      <Button
        onClick={handleShare}
        loading={loading}
        disabled={loading}
        color="blue"
        leftSection={<IconShare size={16} />}
      >
        Share game
      </Button>
    </div>
  );
}
