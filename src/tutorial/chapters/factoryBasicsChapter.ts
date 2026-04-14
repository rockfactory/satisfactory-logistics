import type { TutorialChapter } from './types';

export const factoryBasicsChapter: TutorialChapter = {
  id: 'factory-basics',
  title: 'Factory basics',
  description: 'Create factories and organize their inputs and outputs.',
  route: '/factories',
  steps: [
    {
      popover: {
        title: 'Welcome to the Factories tab',
        description:
          'This is where you plan your Satisfactory factories. Each factory represents a production site with its own inputs and outputs.',
      },
    },
    {
      element: '[data-tutorial-id="games-menu"]',
      popover: {
        title: 'Your active Game',
        description:
          'A Game groups a set of factories together (like a savegame). You can create multiple Games, switch between them and sync them online.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tutorial-id="add-factory-btn"]',
      popover: {
        title: 'Add a factory',
        description:
          'Click here to create a new factory. From the empty state you can also import an existing game.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tutorial-id="view-switcher"]',
      popover: {
        title: 'Three ways to view factories',
        description:
          'Switch between Grid (cards), Kanban (status columns) and Spreadsheet (compact rows) depending on what you need.',
        side: 'bottom',
      },
    },
    {
      popover: {
        title: 'Inputs, outputs, progress',
        description:
          'Inside each factory you set its outputs (what it produces) and inputs (which can be sourced from another factory). You can also mark the build progress to keep track of what is actually built in your save.',
      },
    },
  ],
};
