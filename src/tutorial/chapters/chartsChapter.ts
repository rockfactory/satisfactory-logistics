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
          element: '[data-tutorial-id="chart-factory-node"]',
          popover: {
            title: 'Factory details on hover',
            description:
              'Hover any factory card to open a detail popover: you can rename the factory, see its full production/consumption table with per-output usage, and jump straight to the factory page or its calculator.',
            side: 'right',
          },
        },
        {
          element: '[data-tutorial-id="charts-view-switcher"]',
          popover: {
            title: 'Graph, Sankey, or Dimensional Depot',
            description:
              'Use this switcher to flip between three views of the same data: Graph (the node diagram you just saw), Sankey (the same data as proportional flows), and Dimensional Depot (a per-item tally of every output you mark as uploaded to the Dimensional Depot). It really pays off once you have several factories linked together.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
