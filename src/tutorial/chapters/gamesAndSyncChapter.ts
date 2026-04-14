import type { TutorialChapter } from './types';

export const gamesAndSyncChapter: TutorialChapter = {
  id: 'games-and-sync',
  title: 'Games & Sync',
  description:
    'Manage Games, import savegames and sync your work across devices.',
  segments: [
    {
      route: '/games',
      autoNavigate: true,
      steps: [
        {
          popover: {
            title: 'The Games page',
            description:
              'Each Game is an independent set of factories. Switch between Games or create new ones for different playthroughs.',
          },
        },
        {
          element: '[data-tutorial-id="import-from-tools"]',
          popover: {
            title: 'Import from other tools',
            description:
              'Import a game exported from Satisfactory Logistics itself or from other planners, so you do not have to start from scratch.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="user-menu"]',
          popover: {
            title: 'Login & cloud sync',
            description:
              'Log in with Google or Discord to sync your Games to the cloud, access them on other devices, and share them with other players.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
