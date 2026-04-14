import type { TutorialChapter } from './types';

export const chartsChapter: TutorialChapter = {
  id: 'charts',
  title: 'Charts',
  description: 'Aggregated visualizations of all your factories.',
  nextChapterId: 'games-and-sync',
  segments: [
    {
      route: '/factories/charts',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="charts-view-switcher"]',
          popover: {
            title: 'Graph and Sankey views',
            description:
              'Switch between a node graph of your factories and a Sankey diagram showing resource flows between them. Most useful once you have several factories linked together.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
