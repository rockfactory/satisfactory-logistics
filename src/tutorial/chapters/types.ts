import type { DriveStep } from 'driver.js';

export interface ChapterSegmentContext {
  demoFactoryId: string | null;
  consumerFactoryId: string | null;
}

export type SegmentRoute =
  | string
  | RegExp
  | ((ctx: ChapterSegmentContext) => string | RegExp);

export interface TutorialChapterSegment {
  /**
   * Route (or pattern) at which this segment runs.
   * - string: exact pathname (e.g. '/factories')
   * - RegExp: pattern (e.g. /^\/factories\/[^/]+$/ for factory detail pages)
   * - function: derived from context at runtime
   */
  route: SegmentRoute;
  /**
   * If true (default), the tutorial navigates to this route automatically
   * when starting the segment. If false, it waits for the user to navigate
   * there (typical between-steps in an interactive chapter).
   */
  autoNavigate?: boolean;
  steps: DriveStep[];
}

export interface TutorialChapter {
  id: string;
  title: string;
  description: string;
  segments: TutorialChapterSegment[];
  /** If set, this chapter is auto-started after the current one completes. */
  nextChapterId?: string;
  /**
   * Runs once before the first segment of this chapter. Useful to seed
   * state (e.g. create a demo entity) so segment routes can resolve.
   */
  setup?: () => void | Promise<void>;
  /**
   * Optional custom recap shown in the outro modal in place of the
   * default "Up next: <next chapter>" text. Use it when the chapter
   * has its own closing message worth showing the user.
   */
  outroBody?: string;
}
