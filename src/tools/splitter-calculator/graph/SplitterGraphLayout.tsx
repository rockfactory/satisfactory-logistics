import dagre from '@dagrejs/dagre';
import { Box } from '@mantine/core';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useRef, useState } from 'react';
import { BeltEdge } from './edges/BeltEdge';
import { BeltSourceNode } from './nodes/BeltSourceNode';
import { BeltTargetNode } from './nodes/BeltTargetNode';
import { MergerNode } from './nodes/MergerNode';
import { SmartSplitterNode } from './nodes/SmartSplitterNode';
import { SplitterNode } from './nodes/SplitterNode';

const nodeTypes = {
  source: BeltSourceNode,
  splitter: SplitterNode,
  merger: MergerNode,
  smart_splitter: SmartSplitterNode,
  target: BeltTargetNode,
};

const edgeTypes = {
  belt: BeltEdge,
};

const LAYOUT_OPTIONS = {
  rankdir: 'LR' as const,
  nodesep: 60,
  edgesep: 20,
  ranksep: 160,
  ranker: 'network-simplex' as const,
};

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph(LAYOUT_OPTIONS);

  for (const node of nodes) {
    const width = node.measured?.width ?? 120;
    const height = node.measured?.height ?? 40;
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutedNodes = nodes.map(node => {
    const dagreNode = g.node(node.id);
    const width = node.measured?.width ?? 120;
    const height = node.measured?.height ?? 40;
    return {
      ...node,
      position: {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      },
    };
  });

  // Align all sources to a common left x and all targets to a common right x
  const sourceNodes = layoutedNodes.filter(n => n.type === 'source');
  const targetNodes = layoutedNodes.filter(n => n.type === 'target');

  if (sourceNodes.length > 1) {
    const minX = Math.min(...sourceNodes.map(n => n.position.x));
    for (const n of sourceNodes) n.position.x = minX;
  }
  if (targetNodes.length > 1) {
    const maxX = Math.max(...targetNodes.map(n => n.position.x));
    for (const n of targetNodes) n.position.x = maxX;
  }

  return { nodes: layoutedNodes, edges };
}

interface SplitterGraphLayoutProps {
  nodes: Node[];
  edges: Edge[];
}

export function SplitterGraphLayout(props: SplitterGraphLayoutProps) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(props.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(props.edges);
  const [opacity, setOpacity] = useState(0);
  const nodesInitialized = useNodesInitialized();
  const [layoutDone, setLayoutDone] = useState(false);
  const prevPropsRef = useRef(props);

  useEffect(() => {
    setNodes([...props.nodes]);
    setEdges([...props.edges]);
    setLayoutDone(false);
    setOpacity(0);
    prevPropsRef.current = props;
  }, [props.nodes, props.edges, setNodes, setEdges]);

  useEffect(() => {
    const isMeasured =
      nodesInitialized &&
      nodes[0]?.measured?.width &&
      nodes[0]?.measured?.height;

    if (isMeasured && !layoutDone) {
      const layouted = getLayoutedElements(nodes, edges);
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
      setLayoutDone(true);
    }

    if (isMeasured && layoutDone) {
      fitView().then(() => setOpacity(1));
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: layout effect
  }, [nodesInitialized, layoutDone]);

  return (
    <Box w="100%" h="65vh" opacity={opacity}>
      <ReactFlow
        minZoom={0.2}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        snapToGrid
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        snapGrid={[10, 10]}
        nodesDraggable
        nodesConnectable={false}
      >
        <Controls showFitView />
        <MiniMap
          style={{ height: 80, width: 120 }}
          nodeStrokeWidth={3}
          maskColor="rgba(0,0,0,0.5)"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </Box>
  );
}
