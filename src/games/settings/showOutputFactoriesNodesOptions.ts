import type { ShowOutputFactoriesNodesMode } from '@/games/Game';

/**
 * Single source of truth for the labels and short descriptions used by
 * the "Show Output Factories Nodes" setting across the game settings
 * modal and the in-graph node popover dropdowns. Keeping it shared
 * means the dropdown a user sees in either place reads exactly the
 * same so the choice they make matches the wording they remember.
 */
export interface ShowOutputFactoriesNodesOption {
  value: ShowOutputFactoriesNodesMode;
  label: string;
  description: string;
}

export const SHOW_OUTPUT_FACTORIES_NODES_OPTIONS: ShowOutputFactoriesNodesOption[] =
  [
    {
      value: 'none',
      label: 'None',
      description: "Don't display nodes for downstream consumer factories.",
    },
    {
      value: 'allocated',
      label: 'Only allocated',
      description:
        "Show one node per consumer factory that's pulling from this factory's outputs.",
    },
    {
      value: 'all',
      label: 'Allocated and unallocated',
      description:
        'Also show a node for any production capacity that no consumer factory has claimed.',
    },
  ];
