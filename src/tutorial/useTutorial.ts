import { type Driver, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { tutorialChaptersById } from './chapters';
import { waitForElement } from './waitForElement';

export function useTutorial() {
  const navigate = useNavigate();
  const driverRef = useRef<Driver | null>(null);

  const destroyDriver = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const startChapter = useCallback(
    async (chapterId: string) => {
      const chapter = tutorialChaptersById[chapterId];
      if (!chapter) return;

      destroyDriver();

      if (window.location.pathname !== chapter.route) {
        navigate(chapter.route);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      const firstWithElement = chapter.steps.find(s => s.element);
      if (firstWithElement && typeof firstWithElement.element === 'string') {
        await waitForElement(firstWithElement.element);
      }

      const d = driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.6,
        stagePadding: 4,
        steps: chapter.steps,
        popoverClass: 'sl-tutorial-popover',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Done',
        onDestroyStarted: () => {
          const isLast = d.isLastStep();
          if (isLast) {
            useStore.getState().markChapterCompleted(chapter.id);
          } else {
            useStore.getState().setLastChapter(chapter.id);
          }
          d.destroy();
        },
      });

      driverRef.current = d;
      d.drive();
    },
    [navigate, destroyDriver],
  );

  const resetProgress = useCallback(() => {
    destroyDriver();
    useStore.getState().resetTutorialProgress();
  }, [destroyDriver]);

  return { startChapter, resetProgress, destroyDriver };
}
