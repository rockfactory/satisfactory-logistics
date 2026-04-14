import type { TutorialChapter } from './types';

export const calculatorChapter: TutorialChapter = {
  id: 'calculator',
  title: 'Calculator (LP solver)',
  description:
    'Find the optimal production chain given your outputs, inputs and recipes.',
  route: '/factories/calculator',
  steps: [
    {
      popover: {
        title: 'The Calculator',
        description:
          'The Calculator computes the optimal production chain given what you want to produce and the constraints you set on inputs and recipes.',
      },
    },
    {
      element: '[data-tutorial-id="calculator-inputs-outputs"]',
      popover: {
        title: 'Inputs & Outputs',
        description:
          'Open this drawer to choose what you want to produce (outputs) and what raw or intermediate resources you already have (inputs).',
        side: 'bottom',
      },
    },
    {
      element: '[data-tutorial-id="calculator-recipes"]',
      popover: {
        title: 'Recipes',
        description:
          'Enable or disable alternate recipes. The solver is free to combine any enabled recipe to meet your targets.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tutorial-id="calculator-limitations"]',
      popover: {
        title: 'Limitations',
        description:
          'Cap the amount of specific resources (e.g. max 240 Iron Ore/min) to force the solver to stay within your real in-game supply.',
        side: 'bottom',
      },
    },
    {
      popover: {
        title: 'The solution graph',
        description:
          'The solver runs automatically and draws a graph of machines, resources and byproducts. You can drag nodes, zoom, and inspect each step.',
      },
    },
  ],
};
