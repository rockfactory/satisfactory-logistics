/**
 * Briefly draws attention to the persistent tutorial entry point in the
 * header (`?` ActionIcon with `data-tutorial-id="tutorial-menu"`). Used
 * after the user opts out of the tour — either by skipping the welcome
 * modal or by picking "I'm done for now" on a chapter outro modal — so
 * they discover where to come back later.
 *
 * Animation is driven by the `.sl-tutorial-blip` class defined in
 * `driver-theme.css`. Multiple calls in quick succession reset the
 * animation cleanly.
 */
const BLIP_CLASS_STRONG = 'sl-tutorial-blip';
const BLIP_CLASS_SOFT = 'sl-tutorial-blip-soft';
const BLIP_DURATION_STRONG_MS = 3600;
const BLIP_DURATION_SOFT_MS = 1200;
const FIRST_BLIP_STORAGE_KEY = 'sl-tutorial-blip-seen';

function hasBlippedBefore(): boolean {
  try {
    return localStorage.getItem(FIRST_BLIP_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markBlipped(): void {
  try {
    localStorage.setItem(FIRST_BLIP_STORAGE_KEY, '1');
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function blipHelpButton(): void {
  const element = document.querySelector<HTMLElement>(
    '[data-tutorial-id="tutorial-menu"]',
  );
  if (!element) return;

  const strong = !hasBlippedBefore();
  const blipClass = strong ? BLIP_CLASS_STRONG : BLIP_CLASS_SOFT;
  const duration = strong ? BLIP_DURATION_STRONG_MS : BLIP_DURATION_SOFT_MS;

  element.classList.remove(BLIP_CLASS_STRONG, BLIP_CLASS_SOFT);
  // Force reflow so removing + re-adding restarts the animation even if
  // the class is re-added within the same frame.
  void element.offsetWidth;
  element.classList.add(blipClass);

  if (strong) markBlipped();

  setTimeout(() => {
    element.classList.remove(blipClass);
  }, duration);
}
