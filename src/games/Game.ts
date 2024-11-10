import type { Tables } from '@/core/database.types';

export interface Game {
  id: string;
  name: string;
  factoriesIds: string[];
  version?: number;
  // factories: Factory[];
  settings: GameSettings;
  allowedRecipes?: string[];
  collapsedFactoriesIds?: string[];
  // Only if saved
  savedId?: string;
  shareToken?: string | null;
  authorId?: string;
  createdAt?: string;
}

export type GameRemoteData = Pick<
  Tables<'games'>,
  'author_id' | 'created_at' | 'id' | 'share_token'
>;

export interface GameSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
  maxBelt?: string;
  maxPipeline?: string;
}
