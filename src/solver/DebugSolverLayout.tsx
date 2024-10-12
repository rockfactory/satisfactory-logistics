import dagre from '@dagrejs/dagre';
import {
  ConnectionLineType,
  Edge,
  MarkerType,
  Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect } from 'react';

import { Box } from '@mantine/core';
import '@xyflow/react/dist/style.css';
import Graph from 'graphology';
import { HighsLinearSolutionColumn } from 'highs';
import { log } from '../core/logger/log';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const logger = log.getLogger('solver:debug-layout');

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  graph: Graph,
  solution: Record<string, HighsLinearSolutionColumn>,
  direction = 'LR',
) => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });
  const usedNodes = [] as string[];
  graph.forEachNode(node => {
    if (Math.abs(solution[node]?.Primal ?? 0) < Number.EPSILON) return;
    logger.debug(`Node ${node} = ${solution[node]?.Primal}`);
    usedNodes.push(node);
    dagreGraph.setNode(node, { width: nodeWidth, height: nodeHeight });
  });
  graph.forEachEdge((edge, attributes, source, target) => {
    if (!usedNodes.includes(source) || !usedNodes.includes(target)) return;
    dagreGraph.setEdge(source, target);
  });

  dagre.layout(dagreGraph);
  console.log('Used nodes:', usedNodes);
  const newNodes: Node[] = usedNodes.map(nodeId => {
    const node = graph.getNodeAttributes(nodeId);
    const nodeWithPosition = dagreGraph.node(nodeId);
    const newNode = {
      id: nodeId,
      data: node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  const newEdges: Edge[] = graph
    .edges()
    .map(edgeId => {
      const source = graph.source(edgeId);
      const target = graph.target(edgeId);

      // TODO/Slow
      if (
        !newNodes.find(n => n.id === source) ||
        !newNodes.find(n => n.id === target)
      ) {
        return null;
      }

      return {
        id: edgeId,
        label: edgeId,
        source,
        target,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: graph.getEdgeAttributes(edgeId),
      } as Edge;
    })
    .filter(Boolean) as Edge[];

  return { nodes: newNodes, edges: newEdges };
};

interface DebugSolverLayoutProps {
  graph: Graph;
  solution: Record<string, HighsLinearSolutionColumn>;
}

export const DebugSolverLayout = (props: DebugSolverLayoutProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      props.graph,
      props.solution,
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [props.graph, props.solution, setEdges, setNodes]);

  return (
    <Box w="100%" h={600}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      />
    </Box>
  );
};
