import { GameMenu } from '@/games/menu/GameMenu';
import {
  Burger,
  Container,
  Group,
  Image,
  Tabs,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { capitalize } from 'lodash';
import { Link } from 'react-router-dom';
import { UserMenu } from '../auth/UserMenu';
import classes from './Header.module.css';

interface HeaderProps {
  tabs?: string[];
  activeTab?: string | null;
  children?: React.ReactNode;
  onChangeTab?: (tab: string | null) => void;
}

export function Header(props: HeaderProps) {
  const { children } = props;
  const theme = useMantineTheme();
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <header className={classes.header}>
      <Container className={classes.mainSection} size="lg">
        <Group justify="space-between">
          <Group align="flex-start">
            <Link to="/factories">
              <Image
                h={32}
                w="auto"
                src="/images/logo/satisfactory-logistics-logo.png"
                alt="Satisfactory Logistics Planner"
              />
            </Link>
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
          <Group>
            <GameMenu />
            <UserMenu />
          </Group>
        </Group>
      </Container>
      {children}
      {props.tabs && (
        <Container size="lg">
          <Tabs
            defaultValue="factories"
            value={props.activeTab}
            variant="outline"
            visibleFrom="sm"
            onChange={tab => props.onChangeTab?.(tab)}
            classNames={{
              root: classes.tabs,
              list: classes.tabsList,
              tab: classes.tab,
            }}
          >
            <Tabs.List>
              {props.tabs?.map(tab => (
                <Tabs.Tab value={tab} key={tab}>
                  {capitalize(tab)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Container>
      )}
    </header>
  );
}
