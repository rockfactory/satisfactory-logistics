import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { ChapterOutroModal } from './ChapterOutroModal';
import { tutorialChapters } from './chapters';
import { blipHelpButton } from './helpButtonBlip';
import { publishLocation } from './locationBus';
import {
  type OutroChoice,
  type OutroRequest,
  setOutroListener,
} from './outroBus';
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
    blipHelpButton();
  }, []);

  const handleStart = useCallback(() => {
    useStore.getState().markWelcomeSeen();
    setWelcomeOpen(false);
    const first = tutorialChapters[0];
    if (first) {
      void startChapter(first.id);
    }
  }, [startChapter]);

  // === Chapter outro modal: bridged via outroBus ===
  const [outroRequest, setOutroRequest] = useState<OutroRequest | null>(null);
  const outroResolveRef = useRef<((choice: OutroChoice) => void) | null>(null);

  useEffect(() => {
    setOutroListener((req, resolve) => {
      outroResolveRef.current = resolve;
      setOutroRequest(req);
    });
    return () => setOutroListener(null);
  }, []);

  const resolveOutro = useCallback((choice: OutroChoice) => {
    setOutroRequest(null);
    const resolve = outroResolveRef.current;
    outroResolveRef.current = null;
    resolve?.(choice);
  }, []);

  return (
    <>
      {children}
      <WelcomeModal
        opened={welcomeOpen}
        onStart={handleStart}
        onSkip={handleSkip}
      />
      <ChapterOutroModal
        opened={outroRequest != null}
        request={outroRequest}
        onContinue={() => resolveOutro('continue')}
        onDone={() => resolveOutro('done')}
      />
    </>
  );
}
