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
const BLIP_CLASS = 'sl-tutorial-blip';
const BLIP_DURATION_MS = 3000;

export function blipHelpButton(): void {
  const el = document.querySelector<HTMLElement>(
    '[data-tutorial-id="tutorial-menu"]',
  );
  if (!el) return;

  el.classList.remove(BLIP_CLASS);
  // Force reflow so removing + re-adding restarts the animation even if
  // the class is re-added within the same frame.
  void el.offsetWidth;
  el.classList.add(BLIP_CLASS);

  setTimeout(() => {
    el.classList.remove(BLIP_CLASS);
  }, BLIP_DURATION_MS);
}
