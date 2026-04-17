import {
  chainHooks,
  clickSelector,
  ensurePresent,
  rehighlightWhenAvailable,
} from './stepHelpers';
import type { TutorialChapter } from './types';

const GAMES_MENU_TRIGGER = '[data-tutorial-id="games-menu-trigger"]';
const GAMES_MENU_DROPDOWN = '[data-tutorial-id="games-menu-dropdown"]';
const GAMES_MENU_LIST_ENTRY = '[data-tutorial-id="games-menu-list"]';

const ensureGamesMenuOpen = ensurePresent(GAMES_MENU_DROPDOWN, () =>
  clickSelector(GAMES_MENU_TRIGGER),
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
              'Click the active Game name in the header to open this menu. From here you can create a new playthrough, rename the active Game, jump to the <strong>Games list</strong>, or <strong>Share</strong> the Game with friends via a link. Your Game is saved automatically once you log in — the “Save game” entry is only a manual fallback.',
            side: 'right',
          },
          onHighlightStarted: chainHooks(
            ensureGamesMenuOpen,
            rehighlightWhenAvailable(GAMES_MENU_DROPDOWN),
          ),
        },
        {
          element: '[data-tutorial-id="realtime-sync-indicator"]',
          popover: {
            title: 'Realtime sync indicator',
            description:
              'This icon next to the logo tells you whether your Game is synced online. When logged in it turns green and shows the other devices / friends currently editing the same Game. While logged out it stays grey — click it to log in and unlock cloud save, multi-device sync, and sharing.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="user-menu"]',
          popover: {
            title: 'Login to save online',
            description:
              'Log in with Google or Discord and your active Game is uploaded to the cloud automatically — no manual save needed. From that moment every change you make is synced in realtime to the other devices and friends you share the Game with.',
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
            ensureGamesMenuOpen,
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
              'On any saved Game you get a Share button: it generates a link your friends can open to view and edit the same Game (visible only after you log in and the Game has been saved at least once — once logged in, this happens automatically).',
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
