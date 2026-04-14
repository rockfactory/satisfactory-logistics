import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import type { TutorialChapter } from './types';

const CONSUMER_NAME = 'Iron Plates';
const CONSUMER_OUTPUT = 'Desc_IronPlate_C';
const CONSUMER_OUTPUT_AMOUNT = 20;
const LINKED_INPUT = 'Desc_IronIngot_C';
const LINKED_INPUT_AMOUNT = 15;

function ensureConsumerFactory(): string | null {
  const state = useStore.getState();
  const existing = state.tutorial.consumerFactoryId;
  const selectedGame = state.games.selected;
  if (!selectedGame) return null;
  const game = state.games.games[selectedGame];
  if (!game) return null;

  if (
    existing &&
    state.factories.factories[existing] &&
    game.factoriesIds.includes(existing)
  ) {
    return existing;
  }

  const newId = v4();
  state.addGameFactory(newId, null, {
    name: CONSUMER_NAME,
    inputs: [
      {
        resource: LINKED_INPUT,
        amount: LINKED_INPUT_AMOUNT,
        constraint: 'input',
        factoryId: state.tutorial.demoFactoryId ?? undefined,
      },
    ],
    outputs: [{ resource: CONSUMER_OUTPUT, amount: CONSUMER_OUTPUT_AMOUNT }],
    progress: 'todo',
  });
  state.setConsumerFactoryId(newId);
  return newId;
}

export const factoryLinkingChapter: TutorialChapter = {
  id: 'factory-linking',
  title: 'Linking factories',
  description: 'See how a factory can pull resources from another one.',
  nextChapterId: 'charts',
  setup: () => {
    ensureConsumerFactory();
  },
  segments: [
    {
      route: ctx =>
        ctx.consumerFactoryId
          ? `/factories/${ctx.consumerFactoryId}`
          : '/factories',
      autoNavigate: true,
      steps: [
        {
          popover: {
            title: 'A second factory',
            description: `I just created another factory called "${CONSUMER_NAME}". It produces Iron Plates from Iron Ingots — exactly what your first factory makes.`,
          },
        },
        {
          element: '[data-tutorial-id="factory-outputs"]',
          popover: {
            title: 'Its output',
            description:
              'This factory outputs Iron Plate at 20 /min. Same shape as before — resource and amount.',
            side: 'top',
          },
        },
        {
          element: '[data-tutorial-id="factory-inputs"]',
          popover: {
            title: 'Input from another factory',
            description: `The Iron Ingot input is sourced from your "Iron Smelter" factory — pick the source from the dropdown on the left of an input row, just like you would pick "World" for raw resources.`,
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="factory-input-amount"]',
          popover: {
            title: 'Usage at a glance',
            description: `When you focus the amount of an input that points to another factory, a tooltip shows the usage: how much that source produces vs how much you are using. Right now we use ${LINKED_INPUT_AMOUNT} of 30 Iron Ingot/min — 50%.`,
            side: 'bottom',
            align: 'start',
          },
          // Driver.js' overlay/focus dance swallows real keyboard focus,
          // so toggle a tutorial flag that FactoryInputRow ORs with its
          // local `focused` state to force the usage Tooltip open.
          onHighlightStarted: () => {
            useStore.getState().setForceUsageTooltip(true);
          },
          onDeselected: () => {
            useStore.getState().setForceUsageTooltip(false);
          },
        },
        {
          popover: {
            title: 'That is how factories link together',
            description:
              'Once an input points to another factory, the planner knows the two factories are connected. The Charts tour will show you what that looks like.',
          },
        },
      ],
    },
  ],
};
