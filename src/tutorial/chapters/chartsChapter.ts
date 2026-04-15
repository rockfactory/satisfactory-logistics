import { ensureConsumerFactory, ensureDemoFactory } from './demoFactories';
import type { TutorialChapter } from './types';

export const chartsChapter: TutorialChapter = {
  id: 'charts',
  title: 'Charts',
  description: 'Aggregated visualizations of all your factories.',
  estimatedMinutes: 1,
  nextChapterId: 'notes',
  // The charts page is empty until at least two linked factories exist —
  // seed the same Smeltery → Platey McPlateface chain we use elsewhere
  // so the user always lands on a meaningful graph.
  setup: () => {
    ensureDemoFactory();
    ensureConsumerFactory();
  },
  segments: [
    {
      route: '/factories/charts',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="charts-graph"]',
          popover: {
            title: 'Your factory network',
            description:
              'This page shows the whole network of factories at once. Each card is a factory and each edge is a resource exchange between them. Here you can see the Smeltery → Platey McPlateface chain we just built.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="charts-view-switcher"]',
          popover: {
            title: 'Graph or Sankey',
            description:
              'Use this switcher to flip between Graph (the node diagram you just saw) and Sankey (the same data as proportional flows). It really pays off once you have several factories linked together.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
