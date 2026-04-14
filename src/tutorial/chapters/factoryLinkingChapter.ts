import { useStore } from '@/core/zustand';
import {
  CONSUMER_NAME,
  DEMO_NAME,
  ensureConsumerFactory,
  ensureDemoFactory,
  LINKED_INPUT_AMOUNT,
} from './demoFactories';
import type { TutorialChapter } from './types';

export const factoryLinkingChapter: TutorialChapter = {
  id: 'factory-linking',
  title: 'Linking factories',
  description: 'See how a factory can pull resources from another one.',
  nextChapterId: 'charts',
  setup: () => {
    ensureDemoFactory();
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
          element: '[data-tutorial-id="factory-detail"]',
          popover: {
            title: 'A second factory',
            description: `I just created another factory called "${CONSUMER_NAME}". It produces Iron Plates from Iron Ingots — exactly what your first factory makes.`,
            side: 'top',
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
            description: `The Iron Ingot input is sourced from your "${DEMO_NAME}" factory — pick the source from the dropdown on the left of an input row, just like you would pick "World" for raw resources.`,
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
      ],
    },
  ],
};
