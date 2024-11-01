import { log } from '@/core/logger/log';
import { toggleFullscreen } from '@/utils/toggleFullscreen.tsx';
import dagre from '@dagrejs/dagre';
import { Box } from '@mantine/core';
import { IconArrowsMaximize, IconMaximizeOff } from '@tabler/icons-react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ControlButton,
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
import '@xyflow/react/dist/style.css';
import React, { useEffect, useRef, useState } from 'react';
import { FloatingEdge } from '../edges/FloatingEdge';
import { IngredientEdge } from '../edges/IngredientEdge';
import { ByproductNode } from './nodes/byproduct-node/ByproductNode';
import { MachineNode } from './nodes/machine-node/MachineNode';
import { ResourceNode } from './nodes/resource-node/ResourceNode';
import classes from './SolverLayout.module.css';

// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));

const logger = log.getLogger('solver:layout');
logger.setLevel('info');

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
  children?: React.ReactNode;
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = () => {
    toggleFullscreen(ref);
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(document.fullscreenElement === ref.current);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const previousFittedWithNodes = useRef(false);

  // When nodes change, we need to re-layout them.
  useEffect(() => {
    logger.debug('Initializing nodes...');
    // if (!previousFittedWithNodes.current) {
    // }
    setOpacity(0);

    setNodes([...props.nodes]);
    setEdges([...props.edges]);
    setInitialLayoutFinished(false);
    setInitialFitViewFinished(false);

    setTimeout(() => {}, 1);
  }, [props.edges, props.nodes, setEdges, setNodes]);

  useEffect(() => {
    // We can't trust `nodesInitialized` to be true, because it's updated later in the loop.
    // We need to check if the nodes have real measurements.
    const hasRealMeasurements =
      nodes[0]?.measured?.width && nodes[0]?.measured?.height;
    logger.debug(`Check for re-layout: nodesInitialized=${nodesInitialized}, initialLayoutFinished=${initialLayoutFinished} hasRealMeasurements=${hasRealMeasurements}`); // prettier-ignore

    // 1. Nodes are initialized, so we can layout them.
    if (nodesInitialized && hasRealMeasurements && !initialLayoutFinished) {
      logger.info(`-> Layouting (initial layout in progress)`); // prettier-ignore
      logger.debug('Layouting...');
      const layouted = getLayoutedElements(getNodes(), getEdges());

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
      setInitialLayoutFinished(true);
    }

    // 2. Nodes are initialized and layouted, so we can fit the view.
    if (nodesInitialized && initialLayoutFinished && !initialFitViewFinished) {
      logger.debug('-> Fitting view...');
      setInitialFitViewFinished(true);
      if (nodes.length > 0 && !previousFittedWithNodes.current) {
        previousFittedWithNodes.current = true;
        fitView().then(() => {
          setOpacity(1);
          logger.debug('-> Fitting view completed');
        });
      } else {
        setOpacity(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, initialLayoutFinished, initialFitViewFinished]);

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
        proOptions={{
          hideAttribution: true,
        }}
        snapGrid={[10, 10]}
      >
        <Controls showFitView>
          <ControlButton
            onClick={handleToggleFullscreen}
            aria-label="toggle fullscreen"
            title="toggle fullscreen"
            className={classes.fullscreenButton}
          >
            {isFullscreen ? <IconMaximizeOff /> : <IconArrowsMaximize />}
          </ControlButton>
        </Controls>
        <MiniMap pannable={true} nodeStrokeWidth={3} />

        <svg>
          <defs>
            <linearGradient id="edge-gradient">
              <stop offset="0%" stopColor="var(--mantine-color-gray-7)" />
              <stop offset="100%" stopColor="var(--mantine-color-gray-4)" />
            </linearGradient>
            <linearGradient id="edge-gradient-reverse">
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
        {props.children}
        {/* <Panel>{/* <Button onClick={onLayout}>Layout</Button> </Panel> */}
      </ReactFlow>
    </Box>
  );
};
