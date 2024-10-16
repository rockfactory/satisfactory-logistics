export interface Game {
  id: string;
  name: string;
  createdAt?: Date;
  factoriesIds: string[];
  // factories: Factory[];
  settings: GameSettings;
  allowedRecipes?: string[];
  // Only if saved
  savedId?: string;
  shareToken?: string;
}

export interface GameSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
}
