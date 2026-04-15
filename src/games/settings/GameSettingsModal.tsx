import { type Path, setByPath } from '@clickbar/dot-diver';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSettings, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import type { GameSettings } from '@/games/Game';
import { useGameAllowedBuildings, useGameSettings } from '@/games/gamesSlice';
import { SettingSectionNavButton } from './SettingSectionNavButton';
import { AvailableBuildingsSection } from './sections/AvailableBuildingsSection';
import { GraphDisplaySection } from './sections/GraphDisplaySection';
import { TransportLimitsSection } from './sections/TransportLimitsSection';
import { UsageHighlightingSection } from './sections/UsageHighlightingSection';
import { SETTINGS_SECTIONS, type SectionId } from './settingsSections';

// TODO Consider using @mantine/modals manager for consistent modal patterns
const gameSettingsModalListeners = new Set<() => void>();

export function openGameSettingsModal() {
  gameSettingsModalListeners.forEach(fn => {
    fn();
  });
}

const updateGameSettings = (path: Path<GameSettings>, value: any) => {
  useStore.getState().updateGameSettings(state => {
    setByPath(state, path, value);
  });
};

export function GameSettingsModal() {
  const [opened, { open, close }] = useDisclosure(false);
  const [activeSection, setActiveSection] =
    useState<SectionId>('highlighting');

  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    highlighting: null,
    transport: null,
    graph: null,
    buildings: null,
  });

  useEffect(() => {
    gameSettingsModalListeners.add(open);
    return () => {
      gameSettingsModalListeners.delete(open);
    };
  }, [open]);

  const settings = useGameSettings();
  const allowedBuildings = useGameAllowedBuildings();
  const onChange = useFormOnChange<GameSettings>(updateGameSettings);

  const setRef = useCallback(
    (id: SectionId) => (el: HTMLDivElement | null) => {
      sectionRefs.current[id] = el;
    },
    [],
  );

  const handleNavClick = useCallback((id: SectionId) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    setActiveSection(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <Modal
        size="xl"
        onClose={close}
        opened={opened}
        withCloseButton={false}
        padding={0}
        radius="md"
        styles={{
          body: { padding: 0 },
          content: { overflow: 'hidden' },
        }}
      >
        <Group justify="space-between" px="md" py="xs" bg="dark.8">
          <Group gap="xs">
            <ThemeIcon variant="light" color="gray" size="md" radius="sm">
              <IconSettings size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Game Settings
            </Text>
          </Group>
          <ActionIcon variant="subtle" color="gray" onClick={close}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
        <Group align="stretch" gap={0} wrap="nowrap" mih={560}>
          <Box w={220} p="sm" bg="dark.8" style={{ flexShrink: 0 }}>
            <Stack gap={2}>
              {SETTINGS_SECTIONS.map(section => (
                <SettingSectionNavButton
                  key={section.id}
                  section={section}
                  active={activeSection === section.id}
                  onClick={() => handleNavClick(section.id)}
                />
              ))}
            </Stack>
          </Box>
          <ScrollArea
            h={560}
            flex={1}
            bg="dark.7"
            styles={{
              viewport: { padding: 'var(--mantine-spacing-md)' },
            }}
          >
            <Stack gap="md">
              <UsageHighlightingSection
                ref={setRef('highlighting')}
                settings={settings}
                onChange={onChange}
              />
              <TransportLimitsSection
                ref={setRef('transport')}
                settings={settings}
                onChange={onChange}
              />
              <GraphDisplaySection
                ref={setRef('graph')}
                settings={settings}
                onChange={onChange}
              />
              <AvailableBuildingsSection
                ref={setRef('buildings')}
                allowedBuildings={allowedBuildings}
              />
            </Stack>
          </ScrollArea>
        </Group>
      </Modal>
      <Tooltip
        position="bottom"
        label="Game settings: highlights, transport limits & buildings"
      >
        <Button
          onClick={open}
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconSettings size={14} />}
        >
          Settings
        </Button>
      </Tooltip>
    </>
  );
}
