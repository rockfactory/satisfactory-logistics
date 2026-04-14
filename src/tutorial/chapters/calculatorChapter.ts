import {
  clickSelector,
  openAndRehighlight,
  rehighlightWhenAvailable,
} from './stepHelpers';
import type { TutorialChapter } from './types';

export const calculatorChapter: TutorialChapter = {
  id: 'calculator',
  title: 'Calculator',
  description:
    'Compute the optimal production chain for a factory using the solver.',
  nextChapterId: 'factory-linking',
  segments: [
    {
      route: ctx =>
        ctx.demoFactoryId ? `/factories/${ctx.demoFactoryId}` : '/factories',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="factory-view-switcher"]',
          popover: {
            title: 'Open the Calculator from a factory',
            description:
              'Every factory has two views: Overview (the page you are on) and Calculator. Switch with these tabs — I will jump us into the Calculator next.',
            side: 'bottom',
          },
        },
      ],
    },
    {
      route: ctx =>
        ctx.demoFactoryId
          ? `/factories/${ctx.demoFactoryId}/calculator`
          : '/factories/calculator',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="solver-graph"]',
          popover: {
            title: 'The Calculator',
            description:
              'The Calculator computes the optimal production chain based on what you want to produce, the resources available, and the recipes you allow. The graph here is the result for our Iron Smelter factory.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '[data-tutorial-id="calculator-inputs-outputs"]',
          popover: {
            title: 'Inputs & Outputs',
            description:
              'The outputs and inputs you set on the factory show up in this drawer. Adjust or add new ones from here. I will open it for you.',
            side: 'bottom',
          },
          // Open the drawer as we leave this step so the next step can find
          // the calculator-inputs-block element when it initializes.
          onDeselected: () => {
            const drawerOpen = !!document.querySelector(
              '[data-tutorial-id="calculator-inputs-block"]',
            );
            if (!drawerOpen) {
              clickSelector('[data-tutorial-id="calculator-inputs-outputs"]');
            }
          },
        },
        {
          element: '[data-tutorial-id="calculator-inputs-block"]',
          popover: {
            title: 'Auto-set from Plan',
            description:
              'Remember our Iron Ore input with no amount? The “Auto-set from Plan” button (highlighted on the right) fills inputs with the exact amounts the solver computed — no manual math needed.',
            side: 'bottom',
            align: 'end',
          },
          // Drawer animates open while we wait — re-highlight once the
          // element is actually mounted, so the cut-out and popover land
          // on the right place.
          onHighlightStarted: rehighlightWhenAvailable(
            '[data-tutorial-id="calculator-inputs-block"]',
          ),
        },
        {
          element: '[data-tutorial-id="calculator-inputs-block"]',
          popover: {
            title: 'Done — amounts filled in',
            description:
              'I just clicked it for you: Iron Ore now has the exact amount the optimal plan needs.',
            side: 'bottom',
            align: 'end',
          },
          onHighlightStarted: () => {
            clickSelector('[data-tutorial-id="calculator-auto-set"]');
          },
        },
        {
          element: '[data-tutorial-id="factory-input-constraint"]',
          popover: {
            title: 'Input constraint modes',
            description:
              'This icon sets how the solver treats the amount: “Input” (default here) lets it use at least this amount and pull extra from world resources; “Less than” caps it as a maximum; “Exact” forces the solver to use exactly that amount. Pick the one that matches your in-game supply.',
            side: 'bottom',
            align: 'end',
          },
          // Close the drawer as we move on, so the Recipes/Limitations
          // buttons (behind the drawer) become visible for the next steps.
          onDeselected: () => {
            clickSelector('[data-tutorial-id="calculator-drawer-close"]');
          },
        },
        {
          element: '[data-tutorial-id="calculator-recipes"]',
          popover: {
            title: 'Recipes',
            description:
              'Enable or disable alternate recipes. The solver freely combines any enabled recipe to reach your target output.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="calculator-limitations"]',
          popover: {
            title: 'Limitations',
            description:
              'Cap individual resources (e.g. max 240 Iron Ore/min) to force the solver to stay within your actual in-game supply.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="solver-graph"]',
          popover: {
            title: 'The solution graph',
            description:
              'The solver runs automatically and draws the production chain as a graph of resources, machines and byproducts. Drag nodes, zoom, and inspect each step. Next I will walk you through what each node type can do.',
            side: 'top',
          },
        },
        // === Resource node walkthrough ===
        {
          element: '.react-flow__node-Resource',
          popover: {
            title: 'Resource nodes',
            description:
              'On the left of the graph: each resource the solver is pulling in. Selecting one opens a panel with details and actions — let us open this one.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="resource-extractors"]',
          popover: {
            title: 'Extractors breakdown',
            description:
              'For World resources the panel shows how many miners (Mk.1/Mk.2/Mk.3) you need at Impure / Normal / Pure nodes, at 100% and 250% clock. Handy to size your mining setup without leaving the planner.',
            side: 'top',
          },
          onHighlightStarted: openAndRehighlight(
            '.react-flow__node-Resource',
            '[data-tutorial-id="resource-extractors"]',
          ),
        },

        // === Machine node walkthrough ===
        {
          element: '.react-flow__node-Machine',
          popover: {
            title: 'Machine nodes',
            description:
              'Each production machine in the chain. Selecting one opens its actions — let us look at what you can change.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="machine-action-ignore"]',
          popover: {
            title: 'Ignore recipe',
            description:
              'Bans this specific recipe from the plan. The solver will re-plan with whatever other recipes are enabled — great to test alternates without touching the global Recipes drawer.',
            side: 'bottom',
          },
          onHighlightStarted: openAndRehighlight(
            '.react-flow__node-Machine',
            '[data-tutorial-id="machine-action-ignore"]',
          ),
        },
        {
          element: '[data-tutorial-id="machine-action-overclock"]',
          popover: {
            title: 'Overclock',
            description:
              'Runs this machine faster (up to 250%) at the cost of more power. The solver uses this multiplier when deciding how many machines are needed — Apply to commit.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="machine-action-switch-recipe"]',
          popover: {
            title: 'Alternate recipes',
            description:
              'Pick which recipes the solver can use for this output. Uncheck the default and the plan will swap in whichever alternate you enable.',
            side: 'top',
          },
        },

        // === Byproduct / output node walkthrough ===
        {
          element: '.react-flow__node-Byproduct',
          popover: {
            title: 'Output & byproduct nodes',
            description:
              'On the right: your target outputs and any byproducts the plan generates. Selecting one opens its actions.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="byproduct-action-objective"]',
          popover: {
            title: 'Maximize output',
            description:
              'Switch the objective to “Maximize” and the solver will produce as much of this item as possible given your inputs — instead of sticking to a fixed target amount.',
            side: 'top',
          },
          onHighlightStarted: openAndRehighlight(
            '.react-flow__node-Byproduct',
            '[data-tutorial-id="byproduct-action-objective"]',
          ),
        },
      ],
    },
  ],
};
