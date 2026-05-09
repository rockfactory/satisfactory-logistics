import { useStore } from '@/core/zustand';
import { WORLD_SOURCE_ID } from '@/factories/Factory';
import type { TutorialChapter } from './types';

const DEMO_NAME = 'The Smeltery';
const DEMO_OUTPUT_RESOURCE = 'Desc_IronIngot_C';
const DEMO_OUTPUT_AMOUNT = 30;
const DEMO_INPUT_RESOURCE = 'Desc_OreIron_C';

function demoId(): string | null {
  return useStore.getState().tutorial.demoFactoryId ?? null;
}

export const factoryBasicsChapter: TutorialChapter = {
  id: 'factory-basics',
  title: 'Factory basics',
  description: 'Guided walk through creating your first factory.',
  estimatedMinutes: 4,
  nextChapterId: 'calculator',
  outroBody:
    'Nice work. You now have a factory with a name, a status, an output and a sourced input. That is the whole anatomy of a production site in the planner.',
  segments: [
    {
      route: '/factories',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="header-tab-factories"]',
          popover: {
            title: 'The Factories tab',
            description:
              'Inside a Game you organize your work into factories. This is the section we will use for the rest of the tour.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="add-factory-btn"]',
          popover: {
            title: 'Create your first factory',
            description:
              'Click “Add Factory” (or “Add first factory” in the empty state), or just press Next and I will do it for you. We are going to build a small Iron Smelter together.',
            side: 'bottom',
            // Pressing Next (or Enter / right arrow) clicks the Add Factory
            // button for the user; navigation triggers the next segment.
            onNextClick: () => {
              document
                .querySelector<HTMLElement>(
                  '[data-tutorial-id="add-factory-btn"]',
                )
                ?.click();
            },
          },
        },
      ],
    },
    {
      // /factories/:id — factory detail page
      route: /^\/factories\/[^/]+$/,
      autoNavigate: false,
      steps: [
        {
          element: '[data-tutorial-id="factory-detail"]',
          popover: {
            title: 'Factory created',
            description:
              'Great, this is your new factory. I will fill in a small Iron Smelter setup as we go. Use Next/Back (or the arrow keys) to step through.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="factory-properties"]',
          popover: {
            title: 'Name & build status',
            description: `Every factory has a name and a build status. I named this one "${DEMO_NAME}" and set its status to “Todo”. The status tracks whether a factory is just planned, being built, or already running, and it is also what powers the columns in the Kanban view of the Factories list. Set a factory to “Disabled” to temporarily power it down — it stays here but is excluded from global usage totals and charts, and is hidden from the Kanban board.`,
            side: 'left',
          },
          onHighlightStarted: () => {
            const id = demoId();
            if (!id) return;
            useStore.getState().updateFactory(id, f => {
              f.name = DEMO_NAME;
              f.progress = 'todo';
            });
          },
        },
        {
          element: '[data-tutorial-id="factory-outputs"]',
          popover: {
            title: 'Outputs',
            description: `Outputs are what this factory produces. I added Iron Ingot at ${DEMO_OUTPUT_AMOUNT} /min, your target throughput.`,
            side: 'top',
          },
          onHighlightStarted: () => {
            const id = demoId();
            if (!id) return;
            useStore.getState().updateFactory(id, f => {
              if (!f.outputs?.length)
                f.outputs = [{ resource: null, amount: null }];
              f.outputs[0].resource = DEMO_OUTPUT_RESOURCE;
              f.outputs[0].amount = DEMO_OUTPUT_AMOUNT;
            });
          },
        },
        {
          element: '[data-tutorial-id="factory-output-destination"]',
          popover: {
            title: 'Dimensional Depot',
            description:
              'Toggle this on to mark an output as uploaded to the Dimensional Depot. Depot uploads are not counted as supply for other factories, and you can review the totals in the Charts → Dimensional Depot tab.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="factory-inputs"]',
          popover: {
            title: 'Inputs',
            description:
              'Inputs are what this factory consumes. I added Iron Ore (no amount yet, the Calculator tour will fill it in). Each input also has a Source on the left: “World” for raw resources mined from the map, or another factory to chain them together.',
            side: 'bottom',
          },
          onHighlightStarted: () => {
            const id = demoId();
            if (!id) return;
            const factory = useStore.getState().factories.factories[id];
            const alreadyHas = factory?.inputs?.some(
              i => i.resource === DEMO_INPUT_RESOURCE,
            );
            if (alreadyHas) return;
            useStore.getState().addFactoryInput(id, {
              resource: DEMO_INPUT_RESOURCE,
              amount: null,
            });
            // Default constraint is "max" (<= amount). With amount 0 that
            // would force the solver to skip iron entirely, so we flip it
            // to "input" (minimum, extra from world allowed). Also mark
            // the source as World so the solver knows it is pulled from
            // map extractors rather than another factory.
            useStore.getState().updateFactory(id, f => {
              const last = f.inputs?.[f.inputs.length - 1];
              if (last && last.resource === DEMO_INPUT_RESOURCE) {
                last.constraint = 'input';
                last.factoryId = WORLD_SOURCE_ID;
              }
            });
          },
        },
      ],
    },
    {
      route: '/factories',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="view-switcher"]',
          popover: {
            title: 'Three ways to view factories',
            description:
              'Grid, Kanban and Spreadsheet: pick whichever fits what you are doing. The factory you just built appears in all three.',
            side: 'bottom',
          },
        },
      ],
    },
  ],
};
