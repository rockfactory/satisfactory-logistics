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
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ranksep: 120,
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

  // Align sources, targets, and their immediate neighbors into columns
  const nodeById = new Map(layoutedNodes.map(n => [n.id, n]));
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

  // Align splitters that are direct children of sources
  const sourceIds = new Set(sourceNodes.map(n => n.id));
  const postSplitterIds = new Set<string>();
  for (const edge of edges) {
    if (sourceIds.has(edge.source)) {
      const child = nodeById.get(edge.target);
      if (child && child.type === 'splitter') postSplitterIds.add(child.id);
    }
  }
  const postSplitters = layoutedNodes.filter(n => postSplitterIds.has(n.id));
  if (postSplitters.length > 1) {
    const splitterX = Math.min(...postSplitters.map(n => n.position.x));
    for (const n of postSplitters) n.position.x = splitterX;
  }

  // Align mergers that feed directly into targets, but only if they are
  // dedicated merger/splitter nodes whose *only* role is feeding targets.
  // In a chain topology each splitter also feeds the next splitter, so
  // pulling them all to the same X column would create a huge gap.
  const targetIds = new Set(targetNodes.map(n => n.id));
  const preMergerIds = new Set<string>();
  for (const edge of edges) {
    if (targetIds.has(edge.target)) preMergerIds.add(edge.source);
  }
  // Exclude nodes that also feed non-target children (chain splitters)
  for (const edge of edges) {
    if (!targetIds.has(edge.target) && preMergerIds.has(edge.source)) {
      preMergerIds.delete(edge.source);
    }
  }
  const preMergers = layoutedNodes.filter(n => preMergerIds.has(n.id));
  if (preMergers.length > 1) {
    const mergerX = Math.max(...preMergers.map(n => n.position.x));
    for (const n of preMergers) n.position.x = mergerX;
  }

  // Fix overlaps within aligned columns
  const MIN_GAP = 20;
  for (const group of [sourceNodes, postSplitters, targetNodes, preMergers]) {
    if (group.length <= 1) continue;
    group.sort((a, b) => a.position.y - b.position.y);
    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const prevH = prev.measured?.height ?? 40;
      const minY = prev.position.y + prevH + MIN_GAP;
      if (group[i].position.y < minY) {
        group[i].position.y = minY;
      }
    }
  }

  // Sort edge spread indices so connection points match the vertical
  // direction of their counterpart — edges going to higher targets attach
  // higher on the source node, preventing unnecessary crossings.
  const srcGroups = new Map<string, typeof edges>();
  const tgtGroups = new Map<string, typeof edges>();
  for (const edge of edges) {
    if (!srcGroups.has(edge.source)) srcGroups.set(edge.source, []);
    srcGroups.get(edge.source)!.push(edge);
    if (!tgtGroups.has(edge.target)) tgtGroups.set(edge.target, []);
    tgtGroups.get(edge.target)!.push(edge);
  }

  const centerY = (n: Node) => n.position.y + (n.measured?.height ?? 40) / 2;

  for (const [, group] of srcGroups) {
    if (group.length <= 1) continue;
    group.sort((a, b) => {
      const aNode = nodeById.get(a.target);
      const bNode = nodeById.get(b.target);
      return (aNode ? centerY(aNode) : 0) - (bNode ? centerY(bNode) : 0);
    });
    for (let i = 0; i < group.length; i++) {
      group[i] = {
        ...group[i],
        data: { ...group[i].data, sourceEdgeIndex: i },
      };
    }
  }

  for (const [, group] of tgtGroups) {
    if (group.length <= 1) continue;
    group.sort((a, b) => {
      const aNode = nodeById.get(a.source);
      const bNode = nodeById.get(b.source);
      return (aNode ? centerY(aNode) : 0) - (bNode ? centerY(bNode) : 0);
    });
    for (let i = 0; i < group.length; i++) {
      group[i] = {
        ...group[i],
        data: { ...group[i].data, targetEdgeIndex: i },
      };
    }
  }

  // Collect the updated edges (deduped by id)
  const edgeById = new Map<string, Edge>();
  for (const [, group] of srcGroups) {
    for (const e of group) edgeById.set(e.id, e);
  }
  for (const [, group] of tgtGroups) {
    const existing = edgeById.get(group[0].id);
    for (const e of group) {
      const prev = edgeById.get(e.id);
      if (prev) {
        edgeById.set(e.id, { ...prev, data: { ...prev.data, ...e.data } });
      } else {
        edgeById.set(e.id, e);
      }
    }
  }
  const sortedEdges = edges.map(e => edgeById.get(e.id) ?? e);

  return { nodes: layoutedNodes, edges: sortedEdges };
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (layoutDone) return;

    const isMeasured =
      nodesInitialized &&
      nodes[0]?.measured?.width &&
      nodes[0]?.measured?.height;
    if (!isMeasured) return;

    const layouted = getLayoutedElements(nodes, edges);
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    setLayoutDone(true);
    requestAnimationFrame(() => {
      fitView().then(() => setOpacity(1));
    });
  }, [nodesInitialized, nodes, edges, layoutDone, setNodes, setEdges, fitView]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(prev => (prev === node.id ? null : node.id));
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const edgesWithSelection = useMemo(
    () =>
      edges.map(e => ({
        ...e,
        data: { ...e.data, selectedNodeId },
      })),
    [edges, selectedNodeId],
  );

  return (
    <Box w="100%" h="65vh" opacity={opacity}>
      <ReactFlow
        minZoom={0.2}
        nodes={nodes}
        edges={edgesWithSelection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
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
