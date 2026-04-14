import type { Driver, DriveStep } from 'driver.js';
import { waitForElement } from '../waitForElement';
import type { TutorialChapter } from './types';

function clickSelector(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  el?.click();
}

/**
 * Lazily re-highlights a step once its `element` selector has mounted —
 * useful when the element is inside an animated drawer that isn't in the
 * DOM yet when driver.js initializes the step. Guards against the
 * recursion `highlight → onHighlightStarted → highlight → …`.
 */
function rehighlightWhenAvailable(selector: string) {
  let handled = false;
  return async (
    _el: Element | undefined,
    step: DriveStep,
    opts: { driver: Driver },
  ) => {
    if (handled) return;
    handled = true;
    if (document.querySelector(selector)) return;
    const found = await waitForElement(selector, 2000);
    if (found) opts.driver.highlight(step);
  };
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
              'The solver runs automatically and draws the production chain as a graph of machines, resources and byproducts. Drag nodes, zoom, and inspect each step.',
            side: 'top',
          },
        },
      ],
    },
  ],
};
