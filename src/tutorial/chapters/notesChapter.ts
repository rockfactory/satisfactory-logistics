import { useStore } from '@/core/zustand';
import { ensureDemoFactory } from './demoFactories';
import {
  chainHooks,
  ensurePresent,
  rehighlightWhenAvailable,
} from './stepHelpers';
import type { TutorialChapter } from './types';

const NOTES_PANEL_SELECTOR = '[data-tutorial-id="notes-panel"]';

function openNotesPanel(): void {
  if (!useStore.getState().notesUi.isOpen) {
    useStore.getState().toggleNotesPanel(true);
  }
}

function expandNotesPanel(): void {
  if (useStore.getState().notesUi.isCollapsed) {
    useStore.getState().toggleNotesCollapsed(false);
  }
}

function switchTab(tab: 'game' | 'factory'): void {
  useStore.getState().setNotesActiveTab(tab);
}

const ensureNotesOpen = ensurePresent(NOTES_PANEL_SELECTOR, () => {
  openNotesPanel();
  expandNotesPanel();
});

export const notesChapter: TutorialChapter = {
  id: 'notes',
  title: 'Notes',
  description:
    'Keep a floating notebook next to your plan — game-level notes, factory notes, and checklists.',
  nextChapterId: 'games-and-sync',
  outroBody:
    'Notes stay in sync with your Game, travel with cloud save, and the panel lives on top of whatever view you are working in. Press Ctrl+J anytime to reopen it.',
  setup: async () => {
    const state = useStore.getState();
    const gameId = state.games.selected;
    if (!gameId) return;
    const game = state.games.games[gameId];
    if (!game) return;
    // Only seed a demo factory if the Game has none — do not pollute a
    // user who already has real factories to write notes about.
    if (game.factoriesIds.length > 0) return;
    ensureDemoFactory();
  },
  segments: [
    {
      route: '/factories',
      autoNavigate: true,
      steps: [
        {
          element: '[data-tutorial-id="notes-trigger"]',
          popover: {
            title: 'Your floating notebook',
            description:
              'The Notes button opens a small draggable window with a rich editor. Use it for run checklists, recipe reminders, or free-form planning. Shortcut: Ctrl+J (Cmd+J on Mac).',
            side: 'bottom',
          },
          // Pre-open the panel so the next step can highlight it
          // immediately without any missed-frame on the driver highlight.
          onHighlightStarted: ensureNotesOpen,
        },
        {
          element: NOTES_PANEL_SELECTOR,
          popover: {
            title: 'The Notes window',
            description:
              'This is a non-blocking floating window: drag it from the header, resize it from the edges, and keep it open while you work in the Calculator or Factory views.',
            side: 'left',
          },
          onHighlightStarted: chainHooks(
            ensureNotesOpen,
            rehighlightWhenAvailable(NOTES_PANEL_SELECTOR),
          ),
        },
        {
          element: NOTES_PANEL_SELECTOR,
          popover: {
            title: 'Game-level notes',
            description:
              'By default you are writing the Game note — shared across every factory in this Game. Great place for overall goals, the Tier you are aiming for, or a shopping list of items to unlock. Tip: type on an empty line to see the floating menu with headings, lists and checklists; select text to see the bubble menu for bold/italic/code.',
            side: 'left',
          },
          onHighlightStarted: chainHooks(ensureNotesOpen, () =>
            switchTab('game'),
          ),
        },
        {
          element: '[data-tutorial-id="notes-collapse"]',
          popover: {
            title: 'Collapse to stay out of the way',
            description:
              'The chevron collapses the window to just its title bar, so it stays accessible without covering your plan. Click it again (or press Ctrl+J) to bring it back.',
            side: 'left',
          },
          onHighlightStarted: chainHooks(
            ensureNotesOpen,
            rehighlightWhenAvailable('[data-tutorial-id="notes-collapse"]'),
          ),
        },
      ],
    },
    {
      // /factories/:id — factory detail page, so the "Factory" tab exists.
      route: () => {
        const state = useStore.getState();
        const demoId = state.tutorial.demoFactoryId;
        const gameId = state.games.selected;
        const firstId =
          demoId ?? state.games.games[gameId ?? '']?.factoriesIds[0] ?? null;
        return firstId ? `/factories/${firstId}` : /^\/factories\/[^/]+$/;
      },
      autoNavigate: true,
      steps: [
        {
          element: NOTES_PANEL_SELECTOR,
          popover: {
            title: 'Per-factory notes',
            description:
              'When you are inside a factory, the panel gains a "Factory" tab: notes you write here only belong to this specific factory (build order, bus layout, whatever is local to it). Switch with the segmented control in the window header.',
            side: 'left',
          },
          onHighlightStarted: chainHooks(
            ensureNotesOpen,
            () => switchTab('factory'),
            rehighlightWhenAvailable(NOTES_PANEL_SELECTOR),
          ),
        },
      ],
    },
  ],
};
