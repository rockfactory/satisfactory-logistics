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
 * Lazily re-highlights a step once its `element` selector has mounted —
 * useful when the element is inside an animated drawer/popover that
 * isn't in the DOM yet when driver.js initializes the step. Guards
 * against the recursion `highlight → onHighlightStarted → highlight → …`.
 */
export function rehighlightWhenAvailable(selector: string): DriverHook {
  let handled = false;
  return async (_el, step, opts) => {
    if (handled) return;
    handled = true;
    if (document.querySelector(selector)) return;
    const found = await waitForElement(selector, 2000);
    if (found) opts.driver.highlight(step);
  };
}

/**
 * Clicks a ReactFlow node (selecting it, which opens its action popover)
 * then re-highlights the step once the target action element is mounted
 * inside the popover. Same recursion guard as {@link rehighlightWhenAvailable}.
 */
export function openAndRehighlight(
  nodeSelector: string,
  actionSelector: string,
): DriverHook {
  let handled = false;
  return async (_el, step, opts) => {
    if (handled) return;
    handled = true;
    clickSelector(nodeSelector);
    const found = await waitForElement(actionSelector, 2000);
    if (found) opts.driver.highlight(step);
  };
}
