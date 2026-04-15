import {
  chainHooks,
  clickSelector,
  ensurePresent,
  rehighlightWhenAvailable,
} from './stepHelpers';
import type { TutorialChapter } from './types';

const GAMES_MENU_DROPDOWN = '[data-tutorial-id="games-menu-dropdown"]';
const GAMES_MENU_LIST_ENTRY = '[data-tutorial-id="games-menu-list"]';

const ensureGamesMenuOpen = ensurePresent(GAMES_MENU_DROPDOWN, () =>
  clickSelector('[data-tutorial-id="games-menu-trigger"]'),
);
const ensureGamesListEntryVisible = ensurePresent(GAMES_MENU_LIST_ENTRY, () =>
  clickSelector('[data-tutorial-id="games-menu-trigger"]'),
);

export const gamesAndSyncChapter: TutorialChapter = {
  id: 'games-and-sync',
  title: 'Games & Sync',
  description:
    'Manage Games, import savegames and sync your work across devices.',
  estimatedMinutes: 3,
  nextChapterId: 'factory-basics',
  segments: [
    {
      route: '/factories',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="games-menu"]',
          popover: {
            title: 'Start with a Game',
            description:
              'Everything in the planner lives inside a Game, like a Satisfactory save. You can create several Games (one per playthrough) and switch between them from here.',
            side: 'bottom',
          },
        },
        {
          element: GAMES_MENU_DROPDOWN,
          popover: {
            title: 'The Game menu',
            description:
              'Click the active Game name in the header to open this menu. Use “New game” to start a fresh playthrough, “Rename game” to change the active Game’s name, and “Save game” to upload it to the cloud.',
            side: 'right',
          },
          onHighlightStarted: chainHooks(
            ensureGamesMenuOpen,
            rehighlightWhenAvailable(GAMES_MENU_DROPDOWN),
          ),
        },
        {
          element: '[data-tutorial-id="user-menu"]',
          popover: {
            title: 'Login first',
            description:
              'Log in with Google or Discord to unlock cloud save / load / share. This is the prerequisite for everything that follows in this chapter.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="game-save-button"]',
          popover: {
            title: 'Save / Load to the cloud',
            description:
              'Once logged in, this button saves the active Game online. The dropdown next to it also has “Load last save” to pull the latest version from any device. <br/><br/><strong>⚠️ Important:</strong> your Game is auto-saved <strong>only locally</strong> (in this browser). It is <strong>never uploaded to the cloud automatically</strong> — you must click this button (or use “Save game” from the menu) every time you want to push your changes online.',
            side: 'bottom',
          },
        },
        {
          element: GAMES_MENU_LIST_ENTRY,
          popover: {
            title: 'Open the Games page',
            description:
              'This menu entry opens the full Games page, where you can manage every playthrough in one place. Press Next and I will take you there.',
            side: 'left',
            onNextClick: () => {
              clickSelector(GAMES_MENU_LIST_ENTRY);
            },
          },
          onHighlightStarted: chainHooks(
            ensureGamesListEntryVisible,
            rehighlightWhenAvailable(GAMES_MENU_LIST_ENTRY),
          ),
        },
      ],
    },
    {
      route: '/games',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="games-list"]',
          popover: {
            title: 'The Games page',
            description:
              'Here you see all your Games at a glance. Switch between them, create new ones for different playthroughs, or play one to jump back to its factories.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="game-share"]',
          popover: {
            title: 'Share with friends',
            description:
              'On any saved Game you get a Share button: it generates a link your friends can open to view and edit the same Game (visible only after you log in and save the Game at least once).',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="import-from-tools"]',
          popover: {
            title: 'Import from other tools',
            description:
              'Already have a plan in another planner (Satisfactory Tools, etc.)? Import the exported file here so you do not have to start from scratch. No login required.',
            side: 'top',
          },
        },
      ],
    },
  ],
};
