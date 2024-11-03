import { log } from '@/core/logger/log';
import dagre from '@dagrejs/dagre';
import { Edge, InternalNode, Node, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const logger = log.getLogger('graph-layout');

const snapValueToGrid = (value: number) => Math.round(value / 10) * 10;
const snapSizeToGrid = (value: number) => Math.round(value / 20) * 20;

const GraphLayoutOptions = {
  rankdir: 'LR',
  align: undefined,
  nodesep: 50,
  edgesep: 10,
  ranksep: 130,
  ranker: 'network-simplex',
};

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = GraphLayoutOptions.rankdir === 'LR';
  dagreGraph.setGraph(GraphLayoutOptions);

  logger.debug(`getLayouted: nodes[0] width: ${nodes[0].measured?.width ?? '<null>'}, height: ${nodes[0].measured?.height ?? '<null>'}`); // prettier-ignore
  (nodes as (InternalNode | Node)[]).forEach(node => {
    dagreGraph.setNode(node.id, {
      width: snapSizeToGrid(node.measured?.width ?? 0),
      height: snapSizeToGrid(node.measured?.height ?? 0),
    });
  });
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph, GraphLayoutOptions);

  const newNodes: Node[] = (nodes as InternalNode[]).map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: snapValueToGrid(
          nodeWithPosition.x - (node.measured?.width ?? 0) / 2,
        ),
        y: snapValueToGrid(
          nodeWithPosition.y - (node.measured?.height ?? 0) / 2,
        ),
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};
