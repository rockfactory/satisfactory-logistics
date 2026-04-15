import { type Driver, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { tutorialChaptersById } from './chapters';
import type {
  ChapterSegmentContext,
  SegmentRoute,
  TutorialChapter,
  TutorialChapterSegment,
} from './chapters/types';
import { blipHelpButton } from './helpButtonBlip';
import { getCurrentPathname, subscribeLocation } from './locationBus';
import { requestOutro } from './outroBus';
import { waitForElement } from './waitForElement';

const DEMO_FACTORY_ROUTE = /^\/factories\/([^/]+)$/;

function buildContext(): ChapterSegmentContext {
  const t = useStore.getState().tutorial;
  return {
    demoFactoryId: t.demoFactoryId ?? null,
    consumerFactoryId: t.consumerFactoryId ?? null,
  };
}

function resolveRoute(
  route: SegmentRoute,
  ctx: ChapterSegmentContext,
): string | RegExp {
  return typeof route === 'function' ? route(ctx) : route;
}

function matchesRoute(pathname: string, route: string | RegExp): boolean {
  return typeof route === 'string' ? pathname === route : route.test(pathname);
}

function waitForRoute(
  route: string | RegExp,
  timeoutMs = 60000,
): Promise<boolean> {
  return new Promise(resolve => {
    if (matchesRoute(getCurrentPathname(), route)) {
      resolve(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeLocation(pathname => {
      if (matchesRoute(pathname, route)) {
        unsubscribe();
        if (timer) clearTimeout(timer);
        resolve(true);
      }
    });
    timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);
  });
}

type SegmentResult = 'done' | 'closed' | 'advanced';

async function runSegment(
  segment: TutorialChapterSegment,
  isFinalSegment: boolean,
  nextRoute: string | RegExp | null,
): Promise<SegmentResult> {
  const firstWithElement = segment.steps.find(s => s.element);
  if (firstWithElement && typeof firstWithElement.element === 'string') {
    await waitForElement(firstWithElement.element);
  }

  return new Promise(resolve => {
    let completedNaturally = false;
    let advancedByNavigation = false;

    const d: Driver = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 4,
      steps: segment.steps,
      popoverClass: 'sl-tutorial-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: isFinalSegment ? 'Done' : 'Next →',
      onDestroyed: () => {
        unsubscribe();
        if (advancedByNavigation) resolve('advanced');
        else resolve(completedNaturally ? 'done' : 'closed');
      },
      onNextClick: () => {
        if (d.isLastStep()) {
          completedNaturally = true;
          d.destroy();
        } else {
          d.moveNext();
        }
      },
      // Default Back behavior on the first step of a driver instance is
      // to destroy it (which would close the whole tour). Swallow it so
      // the user just stays on the first step instead of bailing out.
      onPrevClick: () => {
        if (!d.isFirstStep()) d.movePrevious();
      },
    });

    const unsubscribe = nextRoute
      ? subscribeLocation(pathname => {
          if (matchesRoute(pathname, nextRoute)) {
            advancedByNavigation = true;
            d.destroy();
          }
        })
      : () => {};

    d.drive();
  });
}

function captureDemoFactoryFromRoute() {
  const match = getCurrentPathname().match(DEMO_FACTORY_ROUTE);
  if (match?.[1]) {
    useStore.getState().setDemoFactoryId(match[1]);
  }
}

async function runChapter(
  chapter: TutorialChapter,
  navigate: (path: string) => void,
): Promise<'done' | 'cancelled'> {
  // Floating notes panel overlaps tutorial highlights, so ensure it is
  // closed before any chapter starts. Chapters that want to show it
  // (e.g. the Notes chapter) reopen it from their own steps.
  useStore.getState().toggleNotesPanel(false);
  if (chapter.setup) {
    await chapter.setup();
  }
  for (let i = 0; i < chapter.segments.length; i++) {
    const segment = chapter.segments[i];
    const ctx = buildContext();
    const route = resolveRoute(segment.route, ctx);
    const isFinalSegment = i === chapter.segments.length - 1;
    const nextSegment = chapter.segments[i + 1];
    const nextRoute = nextSegment ? resolveRoute(nextSegment.route, ctx) : null;

    if (!matchesRoute(getCurrentPathname(), route)) {
      if (segment.autoNavigate !== false && typeof route === 'string') {
        navigate(route);
        await new Promise(r => requestAnimationFrame(r));
      } else {
        const reached = await waitForRoute(route);
        if (!reached) return 'cancelled';
      }
    }

    // Capture the freshly created factory id from the URL so later chapters
    // (e.g. Calculator) can target the factory the user just built.
    if (chapter.id === 'factory-basics') {
      captureDemoFactoryFromRoute();
    }

    const result = await runSegment(segment, isFinalSegment, nextRoute);
    if (result === 'closed') return 'cancelled';
    // 'done' or 'advanced' → continue with next segment
  }
  return 'done';
}

export function useTutorial() {
  const navigate = useNavigate();
  const runningRef = useRef(false);

  const startChapter = useCallback(
    async (chapterId: string) => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        let nextId: string | undefined = chapterId;
        while (nextId) {
          const chapter = tutorialChaptersById[nextId];
          if (!chapter) break;
          const followup = chapter.nextChapterId
            ? tutorialChaptersById[chapter.nextChapterId]
            : undefined;
          // The outro modal is shown after a natural completion, so the
          // driver tour itself never knows it is the "final" step of a
          // multi-chapter chain — always treat as final to keep the
          // "Done" button label clean.
          const result = await runChapter(chapter, navigate);
          if (result === 'cancelled') {
            useStore.getState().setLastChapter(chapter.id);
            blipHelpButton();
            nextId = undefined;
            break;
          }

          useStore.getState().markChapterCompleted(chapter.id);

          // Hand control to the user via the outro modal — they pick
          // whether to chain into the next chapter or stop here.
          const choice = await requestOutro({
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            outroBody: chapter.outroBody,
            nextChapterId: followup?.id,
            nextChapterTitle: followup?.title,
            nextChapterDescription: followup?.description,
          });

          if (choice === 'continue' && followup) {
            nextId = followup.id;
          } else {
            blipHelpButton();
            nextId = undefined;
          }
        }
      } finally {
        runningRef.current = false;
      }
    },
    [navigate],
  );

  const resetProgress = useCallback(() => {
    useStore.getState().resetTutorialProgress();
  }, []);

  return { startChapter, resetProgress };
}
