/**
 * Tiny pub/sub bridge between react-router's `useLocation` (consumed inside
 * the TutorialProvider) and the imperative segment runner in `useTutorial`,
 * which lives outside React's render cycle.
 *
 * The provider pushes the current pathname here whenever it changes; the
 * segment runner subscribes to react to user navigations.
 */

type Listener = (pathname: string) => void;

const listeners = new Set<Listener>();
let currentPathname: string =
  typeof window !== 'undefined' ? window.location.pathname : '/';

export function publishLocation(pathname: string): void {
  if (pathname === currentPathname) return;
  currentPathname = pathname;
  for (const l of listeners) l(pathname);
}

export function subscribeLocation(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentPathname(): string {
  return currentPathname;
}
