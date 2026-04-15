import { calculatorChapter } from './calculatorChapter';
import { chartsChapter } from './chartsChapter';
import { codexAndToolsChapter } from './codexAndToolsChapter';
import { factoryBasicsChapter } from './factoryBasicsChapter';
import { factoryLinkingChapter } from './factoryLinkingChapter';
import { gamesAndSyncChapter } from './gamesAndSyncChapter';
import { notesChapter } from './notesChapter';
import type { TutorialChapter } from './types';

export const tutorialChapters: TutorialChapter[] = [
  gamesAndSyncChapter,
  factoryBasicsChapter,
  calculatorChapter,
  factoryLinkingChapter,
  chartsChapter,
  notesChapter,
  codexAndToolsChapter,
];

export const tutorialChaptersById: Record<string, TutorialChapter> =
  Object.fromEntries(tutorialChapters.map(c => [c.id, c]));

export type { TutorialChapter };
