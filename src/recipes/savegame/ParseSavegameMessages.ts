export type IParseSavegameRequest = {
  type: 'parse';
  file: File;
};

export interface ParsedSatisfactorySave {
  /**
   * Includes all recipes that are available in the savegame, even buildings.
   */
  availableRecipes: string[];
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
