import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { type Edge, type Node } from '@xyflow/react';
import { max } from 'lodash';
import { useMemo } from 'react';
import type { IInputEdgeData } from './edges/input-edge/InputEdge';
import type { IFactoryNodeData } from './nodes/factory-node/FactoryNode';

export function useFactoriesGraph() {
  const factories = useGameFactories();

  return useMemo(() => {
    const nodes: Node<IFactoryNodeData>[] = [];
    const edges: Edge<IInputEdgeData>[] = [];

    const maxInputAmount =
      max(
        factories.flatMap(
          factory => factory.inputs?.map(input => input.amount ?? 0) ?? [],
        ),
      ) ?? 1;

    for (const factory of factories) {
      nodes.push({
        id: factory.id,
        type: 'Factory',
        position: { x: 0, y: 0 },
        data: {
          // TODO make this dynamic if name is not available
          label: factory.name ?? 'Factory',
          factory,
        },
      });

      const inputs = factory.inputs ?? [];

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (!input.factoryId) continue;

        edges.push({
          id: `${factory.id}-i${i}`,
          source: input.factoryId,
          target: factory.id,
          type: 'Input',
          // markerEnd: {
          //   type: MarkerType.ArrowClosed,
          //   width: 5,
          //   height: 5,
          // },
          data: {
            input,
            scaledValue: (input.amount ?? 0) / maxInputAmount,
          },
        });
      }
    }

    return { nodes, edges };
  }, [factories]);
}
