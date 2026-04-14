import type { Driver, DriveStep } from 'driver.js';
import { waitForElement } from '../waitForElement';

type DriverHook = (
  el: Element | undefined,
  step: DriveStep,
  opts: { driver: Driver },
) => void | Promise<void>;

/**
 * Fire a native click on the first element matching `selector`.
 * Used by chapter step hooks to open drawers/menus or select nodes
 * before highlighting elements that only mount as a consequence.
 */
export function clickSelector(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  el?.click();
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
 * Inverse of {@link ensurePresent} — runs `fix` if `presenceSelector`
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
  return async (el, step, opts) => {
    for (const h of hooks) await h(el, step, opts);
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
  return async (_el, step, opts) => {
    if (document.querySelector(selector)) return;
    const found = await waitForElement(selector, 2000);
    if (found) opts.driver.highlight(step);
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
  return async (_el, step, opts) => {
    if (document.querySelector(actionSelector)) return;
    clickSelector(nodeSelector);
    const found = await waitForElement(actionSelector, 2000);
    if (found) opts.driver.highlight(step);
  };
}
