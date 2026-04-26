import type { TutorialChapter } from './types';

export const mapChapter: TutorialChapter = {
  id: 'map',
  title: 'World Map',
  description: 'Browse resource nodes on the Satisfactory map.',
  estimatedMinutes: 1,
  segments: [
    {
      route: '/map',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="header-tab-map"]',
          popover: {
            title: 'The World Map',
            description:
              'Map shows every known resource node on MASSAGE-2 (AB)b. Use it to scout where to put your next factory.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tutorial-id="map-canvas"]',
          popover: {
            title: 'Pan, zoom, and click',
            description:
              'Drag to pan, scroll to zoom. Each marker is a resource node, ringed by its purity (red = impure, yellow = normal, green = pure). Click a marker to see its coordinates, altitude, per-extractor yield table at every overclock step, and buttons to add it to a running total or mark it as used once you have a miner on it.',
            side: 'left',
          },
        },
        {
          element: '[data-tutorial-id="map-sum"]',
          popover: {
            title: 'Sum several nodes',
            description:
              "Flip on Sum mode and tap any nodes you're deciding between. A floating panel at the bottom of the map totals their extraction rates per resource — pick a miner tier and overclock to see the output you'd actually get. Selections reset when you reload.",
            side: 'right',
          },
        },
        {
          element: '[data-tutorial-id="map-bulk-filter"]',
          popover: {
            title: 'Bulk purity filters',
            description:
              'Shortcut buttons. "Pure only" is handy when scouting end-game builds; "All" snaps everything back on.',
            side: 'right',
          },
        },
        {
          element: '[data-tutorial-id="map-used-filter"]',
          popover: {
            title: 'Track used nodes',
            description:
              'Used-node marks are saved per game. Hide them on the map once you have a miner running, and clear them when you start a new base.',
            side: 'right',
          },
        },
        {
          element: '[data-tutorial-id="map-resource-filter"]',
          popover: {
            title: 'Per-resource purity',
            description:
              'Click the icon to toggle a resource entirely, or use the I / N / P chips to pick the exact purities you care about. The number on each chip is the total node count at that purity.',
            side: 'right',
          },
        },
        {
          element: '[data-tutorial-id="map-infrastructure-filter"]',
          popover: {
            title: 'Built infrastructure',
            description:
              'Drop a Satisfactory .sav anywhere on the map and the buildings, conveyor belts, pipes, and rails the player has placed are drawn straight on top of the world. The data lives in memory only — switch games or reload and it is gone. Toggle categories or spline kinds to focus on what matters.',
            side: 'right',
          },
        },
      ],
    },
  ],
};
