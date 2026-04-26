import type { JSONContent } from '@tiptap/react';
import type { Tables } from '@/core/database.types';
import type { SavegameNodeOverride } from '@/recipes/savegame/ParseSavegameMessages';

export interface Game {
  id: string;
  name: string;
  factoriesIds: string[];
  version?: number;
  // factories: Factory[];
  settings: GameSettings;
  allowedRecipes?: string[];
  allowedBuildings?: string[];
  collapsedFactoriesIds?: string[];
  notes?: JSONContent | null;
  /**
   * Map page: ids of resource nodes the player has marked as "used"
   * (i.e. they already built a miner on it). Lives on the game so it
   * syncs and saves alongside factories/notes/etc.
   */
  usedNodes?: string[];
  /**
   * Map page: ids of world collectibles (slugs, sloops, hard drives, …)
   * the player has picked up. Stored alongside {@link usedNodes} for
   * the same sync/save reasons; kept separate because the semantics
   * differ (one-time pickup vs. permanent placement).
   */
  collectedItems?: string[];
  /**
   * Per-node randomization overrides extracted from the imported
   * `.sav`. Layered on top of the static `WorldResourceNodes` dataset
   * by `getSavegameOverrides` so the map shows what the *player's*
   * game actually contains. Applied unconditionally on every import
   * because randomization is the truth of that save, not a user
   * preference (see `feedback_savegame_import_flags`). Absent for
   * vanilla saves (no overrides emitted by the worker).
   */
  savegameNodeOverrides?: SavegameNodeOverride[];
  // Only if saved
  savedId?: string;
  shareToken?: string | null;
  authorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type GameRemoteData = Pick<
  Tables<'games'>,
  'author_id' | 'created_at' | 'id' | 'share_token' | 'updated_at'
>;

export interface GameSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
  maxBelt?: string;
  maxPipeline?: string;
  orthogonalEdges?: boolean;
  disableEdgeAnimation?: boolean;
  /**
   * Controls whether the solver graph displays "Output to factory X" nodes
   * representing this factory's outputs flowing to downstream consumer
   * factories.
   *
   *  - `none`      → never render output-consumer or unallocated nodes.
   *  - `allocated` → render only one node per declared downstream consumer
   *                  (default for new and migrated games).
   *  - `all`       → also render an Unallocated node for any leftover
   *                  output capacity not claimed by a consumer.
   */
  showOutputFactoriesNodes?: ShowOutputFactoriesNodesMode;
}

export type ShowOutputFactoriesNodesMode = 'none' | 'allocated' | 'all';

export const DEFAULT_SHOW_OUTPUT_FACTORIES_NODES: ShowOutputFactoriesNodesMode =
  'allocated';
