import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { tutorialChapters } from './chapters';
import { publishLocation } from './locationBus';
import { useTutorial } from './useTutorial';
import { WelcomeModal } from './WelcomeModal';
import './driver-theme.css';

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const hasSeenWelcome = useStore(state => state.tutorial.hasSeenWelcome);
  const hasRehydrated = useStore(
    state => state.gameSave.hasRehydratedLocalData,
  );
  const { startChapter } = useTutorial();
  const location = useLocation();

  useEffect(() => {
    publishLocation(location.pathname);
  }, [location.pathname]);

  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    if (hasRehydrated && !hasSeenWelcome) {
      setWelcomeOpen(true);
    }
  }, [hasRehydrated, hasSeenWelcome]);

  const handleSkip = useCallback(() => {
    useStore.getState().markWelcomeSeen();
    setWelcomeOpen(false);
  }, []);

  const handleStart = useCallback(() => {
    useStore.getState().markWelcomeSeen();
    setWelcomeOpen(false);
    const first = tutorialChapters[0];
    if (first) {
      void startChapter(first.id);
    }
  }, [startChapter]);

  return (
    <>
      {children}
      <WelcomeModal
        opened={welcomeOpen}
        onStart={handleStart}
        onSkip={handleSkip}
      />
    </>
  );
}
