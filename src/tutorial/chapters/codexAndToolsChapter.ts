import type { TutorialChapter } from './types';

export const codexAndToolsChapter: TutorialChapter = {
  id: 'codex-and-tools',
  title: 'Codex & Tools',
  description: 'Browse game data and the standalone Splitter calculator.',
  segments: [
    {
      route: '/codex',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="header-tab-codex"]',
          popover: {
            title: 'The Codex',
            description:
              'Codex is your in-app reference for everything Satisfactory: items, recipes (including alternates), and buildings — each with its full stats, ingredients and producers. Open it from this tab, or hit Ctrl+K from anywhere to jump straight to the search spotlight.',
            side: 'bottom',
          },
        },
      ],
    },
    {
      route: '/tools',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="header-tab-tools"]',
          popover: {
            title: 'Tools',
            description:
              'Tools is a collection of standalone utilities. The first one is the Splitter calculator, which figures out the best Mk.1/Mk.2/Smart splitter chain to balance a given input across N outputs — handy when laying down belts in-game.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
