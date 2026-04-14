import type { TutorialChapter } from './types';

export const chartsChapter: TutorialChapter = {
  id: 'charts',
  title: 'Charts',
  description: 'Aggregated visualizations of all your factories.',
  route: '/factories/charts',
  steps: [
    {
      element: '[data-tutorial-id="charts-view-switcher"]',
      popover: {
        title: 'Graph and Sankey views',
        description:
          'Switch between a node graph of your factories and a Sankey diagram showing resource flows between them. It is most useful once you have several factories with shared inputs and outputs.',
        side: 'bottom',
      },
    },
  ],
};
