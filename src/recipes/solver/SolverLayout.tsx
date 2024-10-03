import dagre from '@dagrejs/dagre';
import {
  ConnectionLineType,
  Edge,
  InternalNode,
  Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';

import { Box } from '@mantine/core';
import '@xyflow/react/dist/style.css';
import { log } from '../../core/logger/log';
import { FloatingEdge } from './edges/FloatingEdge';
import { MachineNode } from './layout/MachineNode';
import { ResourceNode } from './layout/ResourceNode';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const logger = log.getLogger('solver:layout');

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = 'LR',
) => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  (nodes as (InternalNode | Node)[]).forEach(node => {
    logger.debug(`Node ${node.id}, width: ${node.width}, height: ${node.height}`, { node }); // prettier-ignore
    dagreGraph.setNode(node.id, {
      width: node.measured?.width,
      height: node.measured?.height,
    });
  });
  console.log('Edges:', edges);
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes: Node[] = (nodes as InternalNode[]).map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - (node.measured?.width ?? 0) / 2,
        y: nodeWithPosition.y - (node.measured?.height ?? 0) / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

interface SolverLayoutProps {
  nodes: Node[];
  edges: Edge[];
}

const nodeTypes = {
  Machine: MachineNode,
  Resource: ResourceNode,
};

const edgeTypes = {
  Floating: FloatingEdge,
};

export const SolverLayout = (props: SolverLayoutProps) => {
  const { fitView, getNodes, getEdges } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(props.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(props.edges);
  const [opacity, setOpacity] = useState(0);

  const nodesInitialized = useNodesInitialized();
  const [initialLayoutFinished, setInitialLayoutFinished] = useState(false);

  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(getNodes(), getEdges());

    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);

    window.requestAnimationFrame(async () => {
      await fitView();
      if (!initialLayoutFinished) {
        setInitialLayoutFinished(true);
        setOpacity(1);
      }
    });
  }, [nodes, edges, setNodes, setEdges, fitView, initialLayoutFinished]);

  useEffect(() => {
    setNodes([...props.nodes]);
    setEdges([...props.edges]);
    setInitialLayoutFinished(false);
  }, [props.nodes, props.edges]);

  useEffect(() => {
    if (nodesInitialized && !initialLayoutFinished) {
      logger.debug('Layouting');
      onLayout();
    }
  }, [nodesInitialized, onLayout, initialLayoutFinished]);

  return (
    <Box w={'800px'} h={600} opacity={opacity}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      />
    </Box>
  );
};
