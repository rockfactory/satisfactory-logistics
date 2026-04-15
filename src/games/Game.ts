import type { JSONContent } from '@tiptap/react';
import type { Tables } from '@/core/database.types';

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
}
