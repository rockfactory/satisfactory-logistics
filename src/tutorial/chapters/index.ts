import { calculatorChapter } from './calculatorChapter';
import { chartsChapter } from './chartsChapter';
import { factoryBasicsChapter } from './factoryBasicsChapter';
import { gamesAndSyncChapter } from './gamesAndSyncChapter';
import type { TutorialChapter } from './types';

export const tutorialChapters: TutorialChapter[] = [
  factoryBasicsChapter,
  calculatorChapter,
  chartsChapter,
  gamesAndSyncChapter,
];

export const tutorialChaptersById: Record<string, TutorialChapter> =
  Object.fromEntries(tutorialChapters.map(c => [c.id, c]));

export type { TutorialChapter };
