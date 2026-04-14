import {
  chainHooks,
  clickSelector,
  ensureAbsent,
  ensurePresent,
  openAndRehighlight,
  rehighlightWhenAvailable,
} from './stepHelpers';
import type { TutorialChapter } from './types';

// Use the in-drawer Close button as the presence sentinel — it is mounted
// whenever ANY tab of the drawer is active, so it stays a reliable
// "drawer is open" signal even after switching to Recipes / Limitations
// (whose Tabs.Panel siblings unmount the Inputs/Outputs content).
const DRAWER_PRESENCE = '[data-tutorial-id="calculator-drawer-close"]';
const ensureDrawerOpen = ensurePresent(DRAWER_PRESENCE, () =>
  clickSelector('[data-tutorial-id="calculator-inputs-outputs"]'),
);
const ensureDrawerClosed = ensureAbsent(DRAWER_PRESENCE, () =>
  clickSelector('[data-tutorial-id="calculator-drawer-close"]'),
);

/**
 * Ensures the drawer is open AND the requested tab is active. Idempotent
 * (clicking an already-active Mantine Tab is a no-op), so safe to fire
 * on every step entry — protects against the user navigating Back into
 * a step that expects a different tab than what is currently shown.
 */
function ensureDrawerTab(
  tabValue: 'inputs-outputs' | 'recipes' | 'limitations',
) {
  return chainHooks(ensureDrawerOpen, () => {
    clickSelector(`[data-tutorial-id="calculator-drawer-tab-${tabValue}"]`);
  });
}

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
              'Every factory has two views: Overview (the page you are on) and Calculator. Switch with these tabs. I will jump us into the Calculator next.',
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
              'The Calculator computes the optimal production chain based on what you want to produce, the resources available, and the recipes you allow. The graph here is the result for our “The Smeltery” factory.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '[data-tutorial-id="calculator-inputs-block"]',
          popover: {
            title: 'Inputs/Outputs drawer',
            description:
              'I just opened the Inputs/Outputs drawer (toggle it from the button at the top right). The inputs and outputs you set on the factory show up here, ready to be adjusted: change amounts, swap constraints, or add new ones.',
            side: 'bottom',
            align: 'end',
          },
          onHighlightStarted: chainHooks(
            ensureDrawerTab('inputs-outputs'),
            rehighlightWhenAvailable(
              '[data-tutorial-id="calculator-inputs-block"]',
            ),
          ),
        },
        {
          element: '[data-tutorial-id="calculator-auto-set"]',
          popover: {
            title: 'Auto-set from Plan',
            description:
              'Remember our Iron Ore input with no amount? This button fills inputs with the exact amounts the solver computed, no manual math needed. I just clicked it for you: see Iron Ore on the left now reads the optimal amount.',
            side: 'left',
          },
          onHighlightStarted: chainHooks(
            ensureDrawerTab('inputs-outputs'),
            rehighlightWhenAvailable(
              '[data-tutorial-id="calculator-auto-set"]',
            ),
            () => clickSelector('[data-tutorial-id="calculator-auto-set"]'),
          ),
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
          onHighlightStarted: ensureDrawerTab('inputs-outputs'),
        },
        {
          element: '[data-tutorial-id="calculator-drawer-tab-recipes"]',
          popover: {
            title: 'Recipes',
            description:
              'Enable or disable alternate recipes. The solver freely combines any enabled recipe to reach your target output.',
            side: 'bottom',
          },
          onHighlightStarted: ensureDrawerTab('recipes'),
        },
        {
          element: '[data-tutorial-id="recipes-from-savegame"]',
          popover: {
            title: 'Import recipes from a savegame',
            description:
              'Inside the Recipes tab there is a “From Save” button: drop your Satisfactory `.sav` file and it auto-enables only the alternate recipes you have actually unlocked in that game. No more guessing which alternates you have available.',
            side: 'left',
          },
          onHighlightStarted: chainHooks(
            ensureDrawerTab('recipes'),
            rehighlightWhenAvailable(
              '[data-tutorial-id="recipes-from-savegame"]',
            ),
          ),
        },
        {
          element: '[data-tutorial-id="calculator-drawer-tab-limitations"]',
          popover: {
            title: 'Limitations',
            description:
              'Limit what the solver is allowed to use: enable / disable World resources (or set custom max amounts per resource), pick which Buildings the factory can use (with optional override of the global game settings), and choose the Belt / Pipeline tier so over-capacity flows get flagged.',
            side: 'bottom',
          },
          onHighlightStarted: ensureDrawerTab('limitations'),
        },
        // === Resource node walkthrough ===
        {
          element: '.react-flow__node-Resource',
          popover: {
            title: 'Resource nodes',
            description:
              'On the left of the graph: each resource the solver is pulling in. Selecting one opens a panel with details and actions. Let us open this one.',
            side: 'bottom',
          },
          onHighlightStarted: ensureDrawerClosed,
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
              'Each production machine in the chain. Selecting one opens its actions. Let us look at what you can change.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="machine-action-ignore"]',
          popover: {
            title: 'Ignore recipe',
            description:
              'Bans this specific recipe from the plan. The solver will re-plan with whatever other recipes are enabled. Great to test alternates without touching the global Recipes drawer.',
            side: 'bottom',
          },
          onHighlightStarted: openAndRehighlight(
            '.react-flow__node-Machine',
            '[data-tutorial-id="machine-action-ignore"]',
          ),
        },
        {
          element: '[data-tutorial-id="machine-action-done"]',
          popover: {
            title: 'Mark as built',
            description:
              'Tracks real-world construction progress: tick this when the machine is actually built in your save. Word on the assembly line says there might be a tiny surprise the first time you hit it… maybe try it later. 😉',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="machine-action-overclock-somersloops"]',
          popover: {
            title: 'Overclock and Somersloops',
            description:
              'Two production tweaks side by side: Overclock runs the machine faster (up to 250%) at the cost of more power, while Somersloops slot in to amplify output (each slot adds extra throughput from the same inputs). The solver uses both when deciding how many machines you need. Click Apply to commit.',
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
          element: '[data-tutorial-id="byproduct-action-objective"]',
          popover: {
            title: 'Output nodes: Maximize',
            description:
              'On the right: your target outputs and any byproducts the plan generates. Selecting one opens its actions. The most useful is the Objective: switch to “Maximize” and the solver will produce as much of this item as possible given your inputs, instead of sticking to a fixed target amount.',
            side: 'left',
            align: 'start',
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
