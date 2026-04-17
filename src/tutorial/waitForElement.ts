/**
 * Resolves with the first element matching `selector`, or `null` after
 * `timeoutMs`. Used to wait for elements inside animated drawers/popovers
 * that aren't mounted yet when a tutorial step initializes.
 */
export function waitForElement(
  selector: string,
  timeoutMs = 3000,
): Promise<Element | null> {
  return new Promise(resolve => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        if (timer) clearTimeout(timer);
        resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}
