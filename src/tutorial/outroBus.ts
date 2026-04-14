/**
 * Tiny bridge between `useTutorial` (which lives outside React's render
 * cycle once a chapter is running) and `TutorialProvider` (which mounts
 * the `ChapterOutroModal`). The runner calls `requestOutro` and awaits
 * the user's choice; the provider registers a listener that opens the
 * modal and resolves the promise when the user clicks Continue or Done.
 */

export type OutroChoice = 'continue' | 'done';

export interface OutroRequest {
  chapterId: string;
  chapterTitle: string;
  /** Optional chapter-specific closing recap, replaces the default body. */
  outroBody?: string;
  nextChapterId?: string;
  nextChapterTitle?: string;
  nextChapterDescription?: string;
}

type Listener = (
  req: OutroRequest,
  resolve: (choice: OutroChoice) => void,
) => void;

let listener: Listener | null = null;

export function setOutroListener(fn: Listener | null): void {
  listener = fn;
}

export function requestOutro(req: OutroRequest): Promise<OutroChoice> {
  return new Promise(resolve => {
    if (listener) listener(req, resolve);
    // No provider → bail out as if the user said done.
    else resolve('done');
  });
}
