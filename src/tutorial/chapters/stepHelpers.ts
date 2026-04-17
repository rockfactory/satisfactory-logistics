import type { Driver, DriveStep } from 'driver.js';
import { waitForElement } from '../waitForElement';

type DriverHook = (
  element: Element | undefined,
  step: DriveStep,
  opts: { driver: Driver },
) => void | Promise<void>;

/**
 * Fire a native click on the first element matching `selector`.
 * Used by chapter step hooks to open drawers/menus or select nodes
 * before highlighting elements that only mount as a consequence.
 */
export function clickSelector(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  element?.click();
}

/**
 * Hook that, on every entry of a step (forward OR back), runs `fix` if
 * `presenceSelector` is NOT mounted in the DOM. Use it as a precondition
 * to ensure something (a drawer, a popover, an opened menu) is present
 * before driver tries to highlight an element inside it.
 */
export function ensurePresent(
  presenceSelector: string,
  fix: () => void,
): DriverHook {
  return () => {
    if (!document.querySelector(presenceSelector)) fix();
  };
}

/**
 * Inverse of {@link ensurePresent}: runs `fix` if `presenceSelector`
 * IS mounted. Useful to close a drawer/popover whose presence would
 * cover the next step's target.
 */
export function ensureAbsent(
  presenceSelector: string,
  fix: () => void,
): DriverHook {
  return () => {
    if (document.querySelector(presenceSelector)) fix();
  };
}

/** Compose multiple driver hooks into one. */
export function chainHooks(...hooks: DriverHook[]): DriverHook {
  return async (element, step, opts) => {
    for (const h of hooks) await h(element, step, opts);
  };
}

/**
 * Lazily re-highlights a step once its `element` selector has mounted —
 * useful when the element is inside an animated drawer/popover that
 * isn't in the DOM yet when driver.js initializes the step.
 *
 * The natural recursion guard is the DOM check: when `highlight(step)`
 * re-fires this hook, the element is now present so we return early
 * without scheduling another highlight. Crucially this is *not* a
 * persistent flag, so re-entering the step (Back then Next) works too.
 */
export function rehighlightWhenAvailable(selector: string): DriverHook {
  return async (_element, step, opts) => {
    const current = opts.driver.getActiveElement();
    // If the element is already the one driver is highlighting, nothing to
    // do. If it's in the DOM but driver didn't latch onto it (e.g. it
    // mounted between driver's resolve and this hook, or driver fell back
    // to the dummy element because the target was missing at resolve
    // time), force a refresh. Otherwise wait for it to mount.
    const present = document.querySelector(selector);
    if (present && current === present) return;
    if (present) {
      opts.driver.highlight(step);
      return;
    }
    const found = await waitForElement(selector, 2000);
    if (found) {
      await new Promise(r => requestAnimationFrame(r));
      opts.driver.highlight(step);
    }
  };
}

/**
 * Clicks a ReactFlow node (selecting it, which opens its action popover)
 * then re-highlights the step once the target action element is mounted
 * inside the popover. Same recursion logic as
 * {@link rehighlightWhenAvailable}: relies on the DOM presence check to
 * stop the recursive highlight from re-clicking the node.
 */
export function openAndRehighlight(
  nodeSelector: string,
  actionSelector: string,
): DriverHook {
  return async (_element, step, opts) => {
    if (document.querySelector(actionSelector)) return;
    clickSelector(nodeSelector);
    const found = await waitForElement(actionSelector, 2000);
    if (found) opts.driver.highlight(step);
  };
}
