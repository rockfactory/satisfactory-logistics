import dagre from '@dagrejs/dagre';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Edge,
  InternalNode,
  MiniMap,
  Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Box } from '@mantine/core';
import '@xyflow/react/dist/style.css';
import { log } from '../../core/logger/log';
import { FloatingEdge } from './edges/FloatingEdge';
import { IngredientEdge } from './edges/IngredientEdge';
import { ByproductNode } from './layout/ByproductNode';
import { MachineNode } from './layout/MachineNode';
import { ResourceNode } from './layout/ResourceNode';

// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));

const logger = log.getLogger('solver:layout');

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
// const graphControls = useControls({
//   rankdir: {
//     value: 'LR',
//     options: ['LR', 'TB'],
//   },
//   align: {
//     value: undefined,
//     options: [undefined, 'DL', 'UL', 'DR', 'UR'],
//   },
//   nodesep: {
//     value: 50,
//     min: 10,
//     max: 200,
//   },
//   edgesep: {
//     value: 10,
//     min: 2,
//     max: 100,
//   },
//   ranksep: {
//     value: 130,
//     min: 10,
//     max: 200,
//   },
//   ranker: {
//     value: 'network-simplex',
//     options: ['network-simplex', 'tight-tree', 'longest-path'],
//   },
// });

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  // graphOptions: dagre.configUnion,
) => {
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

interface SolverLayoutProps {
  nodes: Node[];
  edges: Edge[];
}

const nodeTypes = {
  Machine: MachineNode,
  Resource: ResourceNode,
  Byproduct: ByproductNode,
};

const edgeTypes = {
  Floating: FloatingEdge,
  Ingredient: IngredientEdge,
};

export const SolverLayout = (props: SolverLayoutProps) => {
  const { fitView, getNodes, getEdges } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(props.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(props.edges);
  const [opacity, setOpacity] = useState(0);

  const nodesInitialized = useNodesInitialized();
  const [initialLayoutFinished, setInitialLayoutFinished] = useState(false);
  const [initialFitViewFinished, setInitialFitViewFinished] = useState(false);

  const onLayout = useCallback(() => {
    logger.debug('Layouting...');
    const layouted = getLayoutedElements(getNodes(), getEdges());

    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    setInitialLayoutFinished(true);

    // window.requestAnimationFrame(async () => {
    //   await fitView();
    //   setOpacity(1);
    // });

    // window.requestAnimationFrame(async () => {
    //   logger.debug('Fitting view..');
    //   await
    //   if (!initialLayoutFinished) {
    //     logger.debug('Initial layout finished');
    //     setInitialLayoutFinished(true);
    //     setOpacity(1);
    //   }
    // });
  }, [nodes, edges, setNodes, setEdges, fitView, initialLayoutFinished]);

  useEffect(() => {
    logger.debug('Initializing nodes...');
    setOpacity(0);

    setNodes([...props.nodes]);
    setEdges([...props.edges]);

    setTimeout(() => {
      setInitialLayoutFinished(false);
      setInitialFitViewFinished(false);
    }, 0);
  }, [props.edges, props.nodes]);

  useEffect(() => {
    // logger.debug(
    //   `Check for re-layout: nodesInitialized=${nodesInitialized}, initialLayoutFinished=${initialLayoutFinished}`,
    // );
    if (nodesInitialized && !initialLayoutFinished) {
      logger.debug('-> Layouting (initial layout in progress)');
      onLayout();
    }
    if (nodesInitialized && initialLayoutFinished && !initialFitViewFinished) {
      setInitialFitViewFinished(true);
      fitView().then(() => {
        setOpacity(1);
        logger.debug('-> Fitting view');
      });
    }
  }, [nodesInitialized, onLayout, initialLayoutFinished]);

  const ref = useRef<HTMLDivElement>(null);

  // Context menu
  // const onNodeContextMenu = useCallback(
  //   (event: React.MouseEvent, node: Node) => {
  //     // Prevent native context menu from showing
  //     event.preventDefault();

  //     // Calculate position of the context menu. We want to make sure it
  //     // doesn't get positioned off-screen.
  //     const pane = ref.current!.getBoundingClientRect();
  //     setMenu({
  //       id: node.id,
  //       top: event.clientY < pane.height - 200 && event.clientY,
  //       left: event.clientX < pane.width - 200 && event.clientX,
  //       right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
  //       bottom:
  //         event.clientY >= pane.height - 200 && pane.height - event.clientY,
  //     });
  //   },
  //   [setMenu],
  // );

  return (
    <Box w={'100%'} h={'80vh'} opacity={opacity}>
      <ReactFlow
        ref={ref}
        minZoom={0.2}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        // onNodeContextMenu={onNodeContextMenu}
        fitView
        snapToGrid
        colorMode="dark"
        snapGrid={[10, 10]}
      >
        <Controls showFitView />
        <MiniMap nodeStrokeWidth={3} />

        <svg>
          <defs>
            <linearGradient id="edge-gradient">
              {/* <stop offset="0%" stopColor="#ae53ba" />
            <stop offset="100%" stopColor="#2a8af6" /> */}
              <stop offset="0%" stopColor="var(--mantine-color-gray-7)" />
              <stop offset="100%" stopColor="var(--mantine-color-gray-4)" />
            </linearGradient>
            <linearGradient id="edge-gradient-reverse">
              {/* <stop offset="0%" stopColor="#ae53ba" />
            <stop offset="100%" stopColor="#2a8af6" /> */}
              <stop offset="0%" stopColor="var(--mantine-color-gray-4)" />
              <stop offset="100%" stopColor="var(--mantine-color-gray-7)" />
            </linearGradient>

            <marker
              id="edge-circle"
              viewBox="-5 -5 10 10"
              refX="0"
              refY="0"
              markerUnits="strokeWidth"
              markerWidth="10"
              markerHeight="10"
              orient="auto"
            >
              <circle
                stroke="#2a8af6"
                strokeOpacity="0.75"
                r="2"
                cx="0"
                cy="0"
              />
            </marker>
          </defs>
        </svg>
        <Background
          bgColor="var(--mantine-color-dark-7)"
          color="var(--mantine-color-dark-4)"
          variant={BackgroundVariant.Dots}
          gap={[10, 10]}
        />
        {/* <Panel>{/* <Button onClick={onLayout}>Layout</Button> </Panel> */}
      </ReactFlow>
    </Box>
  );
};
