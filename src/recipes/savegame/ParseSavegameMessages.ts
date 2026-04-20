export type IParseSavegameRequest = {
  type: 'parse';
  file: File;
};

export interface ParsedSatisfactorySave {
  /**
   * Includes all recipes that are available in the savegame, even buildings.
   */
  availableRecipes: string[];
  /**
   * Resource node ids (matching `WorldResourceNodes.json`'s `id` field)
   * that have a miner / oil pump / fracking extractor placed on them in
   * the save. Intended to be written straight into
   * `games[gameId].usedNodes` so imported saves light up the map's
   * used-node state. Water pumps are intentionally excluded: they sit
   * in `FGWaterVolume_*` actors rather than on `BP_ResourceNode_*` so
   * their `mExtractableResource` pathName does not map to a node in
   * our static dataset.
   */
  usedNodeIds: string[];
}

export type IParseSavegameResponse =
  | {
      type: 'parsed';
      save: ParsedSatisfactorySave;
    }
  | {
      type: 'progress';
      progress: number;
      message?: string;
    }
  | {
      type: 'error';
      message: string;
    };
