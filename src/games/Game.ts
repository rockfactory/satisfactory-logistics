export interface Game {
  id: string;
  savedId?: string;
  name: string;
  createdAt?: Date;
  factoriesIds: string[];
  // factories: Factory[];
  settings: GameSettings;
  allowedRecipes?: string[];
}

export interface GameSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
}
