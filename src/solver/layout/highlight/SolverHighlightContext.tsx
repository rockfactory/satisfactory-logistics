import { useStore } from '@xyflow/react';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface SolverHighlightContextValue {
  highlightedNodeId: string | null;
  setHighlightedNodeId: (id: string | null) => void;
  toggleHighlightedNodeId: (id: string) => void;
  clearHighlight: () => void;
}

export const SolverHighlightContext =
  createContext<SolverHighlightContextValue | null>(null);

/**
 * Tracks which node (if any) the user has tapped to highlight its
 * incident edges. Kept separate from React Flow's built-in `selected`
 * state so a tap can highlight edges without opening the node's popover.
 *
 * The popover continues to follow `props.selected`, which is now opened
 * via double-click / double-tap instead of single-click.
 */
export const SolverHighlightProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );

  const toggleHighlightedNodeId = useCallback((id: string) => {
    setHighlightedNodeId(prev => (prev === id ? null : id));
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedNodeId(null);
  }, []);

  const value = useMemo(
    () => ({
      highlightedNodeId,
      setHighlightedNodeId,
      toggleHighlightedNodeId,
      clearHighlight,
    }),
    [highlightedNodeId, toggleHighlightedNodeId, clearHighlight],
  );

  return (
    <SolverHighlightContext.Provider value={value}>
      {children}
    </SolverHighlightContext.Provider>
  );
};

export function useSolverHighlight() {
  const context = useContext(SolverHighlightContext);
  if (!context) {
    throw new Error(
      'useSolverHighlight must be used within a SolverHighlightProvider',
    );
  }
  return context;
}

/**
 * Same as `useSolverHighlight` but safe to call from components that may
 * render outside the provider (e.g. node components used in other graphs).
 * Returns `null` if no provider is present.
 */
export function useSolverHighlightOptional() {
  return useContext(SolverHighlightContext);
}

/**
 * Set of node ids that should appear "in the highlighted chain" when a
 * node is double-tapped: the tapped node itself plus every node it has
 * a direct edge to or from. Returns `null` when no node is highlighted
 * so callers can short-circuit dim logic.
 *
 * Recomputes only when the highlighted id or the underlying edges
 * change. Reads edges from the React Flow store directly so we always
 * see the same edges that the renderer sees.
 */
export function useHighlightedNodeIds(): ReadonlySet<string> | null {
  const highlight = useSolverHighlightOptional();
  const highlightedNodeId = highlight?.highlightedNodeId ?? null;

  return useStore(s => {
    if (highlightedNodeId == null) return null;
    const ids = new Set<string>([highlightedNodeId]);
    for (const edge of s.edges) {
      if (edge.source === highlightedNodeId) ids.add(edge.target);
      else if (edge.target === highlightedNodeId) ids.add(edge.source);
    }
    return ids;
  }, areSetsEqual);
}

/**
 * Per-node convenience hook. Returns true when the given node id should
 * be visually emphasised (the tapped node or one of its direct
 * neighbors), false when it should be dimmed because some other node is
 * highlighted, and null when no node is highlighted at all.
 */
export function useIsNodeHighlighted(nodeId: string): boolean | null {
  const set = useHighlightedNodeIds();
  if (set == null) return null;
  return set.has(nodeId);
}

function areSetsEqual(
  a: ReadonlySet<string> | null,
  b: ReadonlySet<string> | null,
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}
