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
              'Codex is your in-app reference for everything Satisfactory: items, recipes (including alternates), and buildings, each with full stats, ingredients and producers. Open it from this tab, or hit Ctrl+K from anywhere to jump straight to the search spotlight.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="codex-category-items"]',
          popover: {
            title: 'Items',
            description:
              'Use Items when you want the detail page for a material or resource: stack size, sink value, where it is used, and which recipes produce it.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="codex-category-buildings"]',
          popover: {
            title: 'Buildings',
            description:
              'Buildings is the quick reference for machines, logistics parts, extractors, and generators, including their dimensions, power use, and compatible recipes.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="codex-category-recipes"]',
          popover: {
            title: 'Recipes',
            description:
              'Recipes is the full recipe index: search by name, filter Default / Alternate / MAM, then open any recipe to inspect its inputs, outputs, craft time and building.',
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
              'Tools is a collection of standalone utilities. The first one is the Splitter calculator, which figures out the best Mk.1/Mk.2/Smart splitter chain to balance a given input across N outputs. Handy when laying down belts in-game.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
