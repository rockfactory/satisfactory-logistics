import { log } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import type { SolutionNode } from '@/solver/algorithm/solveProduction';
import { FloatingEdge } from '@/solver/edges/FloatingEdge';
import { IngredientEdge } from '@/solver/edges/IngredientEdge';
import type { SolverLayoutState, SolverNodeState } from '@/solver/store/Solver';
import { usePathSolverLayout } from '@/solver/store/solverSelectors';
import { toggleFullscreen } from '@/utils/toggleFullscreen';
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
  type OnNodesChange,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ByproductNode } from './nodes/byproduct-node/ByproductNode';
import { MachineNode } from './nodes/machine-node/MachineNode';
import { ResourceNode } from './nodes/resource-node/ResourceNode';
import classes from './SolverLayout.module.css';
import {
  areSavedLayoutsCompatible,
  areSolverLayoutsEqual,
  computeSolverLayout,
  isSavedLayoutValid,
} from './state/savedSolverLayoutUtils';
import { updateNodesWithLayoutState } from './state/updateNodesWithLayoutState';
import { usePreviousSolverLayoutStates } from './state/usePreviousSolverLayoutStates';

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

function getNodeComputedPosition(
  dagreNode: dagre.Node,
  node: SolutionNode,
  nodeSavedPosition: XYPosition | undefined,
): XYPosition {
  if (nodeSavedPosition) {
    return {
      x: nodeSavedPosition.x,
      y: nodeSavedPosition.y,
    };
  }

  // We are shifting the dagre node position (anchor=center center) to the top left
  // so it matches the React Flow node anchor point (top left).
  return {
    x: snapValueToGrid(dagreNode.x - (node.measured?.width ?? 0) / 2),
    y: snapValueToGrid(dagreNode.y - (node.measured?.height ?? 0) / 2),
  };
}

/**
 * @prop activeLayout - The layout state to use. If null, the layout will be computed. Could be
 *  used to restore a previous layout.
 */
const getLayoutedElements = (
  nodes: SolutionNode[],
  edges: Edge[],
  activeLayout: SolverLayoutState | null | undefined,
  // graphOptions: dagre.configUnion,
) => {
  const useSavedLayout = activeLayout != null;
  logger.debug(`getLayouted: useSavedLayout=${useSavedLayout}`);

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
  const filteredEdges = edges.filter(
    edge =>
      !(
        (nodes.find(n => n.id === edge.source)?.data?.state as SolverNodeState)
          ?.layoutIgnoreEdges ||
        (nodes.find(n => n.id === edge.target)?.data?.state as SolverNodeState)
          ?.layoutIgnoreEdges
      ),
  );

  filteredEdges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // We want to perform layout only if the saved layout is not valid
  if (!useSavedLayout) {
    dagre.layout(dagreGraph, GraphLayoutOptions);
  }

  const newNodes: SolutionNode[] = (nodes as InternalNode<SolutionNode>[]).map(
    node => {
      // Position is calculated based on the dagre node position or, if available,
      // the saved position.
      const nodePosition = getNodeComputedPosition(
        dagreGraph.node(node.id),
        node,
        // We _could_ use the save layout always, but we want to restore to
        // computed layout if atleast one node changes.
        useSavedLayout ? activeLayout[node.id] : undefined,
      );

      const newNode = {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,

        position: nodePosition,
      };

      return newNode as unknown as SolutionNode;
    },
  );

  return { nodes: newNodes, edges: filteredEdges };
};

interface SolverLayoutProps {
  id: string;
  nodes: SolutionNode[];
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
  const savedLayout = usePathSolverLayout(props.id);
  const { fitView, getNodes, getEdges } = useReactFlow<SolutionNode, Edge>();

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

    if (!isSavedLayoutValid(props.nodes, savedLayout)) {
      setOpacity(0);
    }

    // Force re-fit view if nodes change
    // TODO better to do a xor-ing of nodes
    if (props.nodes.length !== getNodes().length) {
      previousFittedWithNodes.current = false;
    }

    // We don't want `savedLayout` to be a dependency, just to use
    // the latest value when the nodes change.
    setNodes([...updateNodesWithLayoutState(props.nodes, savedLayout)]);
    setEdges([...props.edges]);
    setInitialLayoutFinished(false);
    setInitialFitViewFinished(false);

    // setTimeout(() => {}, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.edges, props.nodes, setEdges, setNodes]);

  const { getCompatiblePreviousLayout, cachePreviousLayout } =
    usePreviousSolverLayoutStates();

  useEffect(() => {
    // We can't trust `nodesInitialized` to be true, because it's updated later in the loop.
    // We need to check if the nodes have real measurements.
    const isMeasured =
      nodesInitialized &&
      nodes[0]?.measured?.width &&
      nodes[0]?.measured?.height;

    // logger.debug(`Check for re-layout: nodesInitialized=${nodesInitialized}, initialLayoutFinished=${initialLayoutFinished} hasRealMeasurements=${isMeasured}`); // prettier-ignore

    const shouldRelayout =
      isMeasured && (!initialLayoutFinished || savedLayout == null);

    // 1. Nodes are initialized, so we can layout them. or
    // 1B. Nodes are initialized, but the layout has been reset.
    if (shouldRelayout) {
      logger.info(`-> Layouting (initial layout in progress)`); // prettier-ignore

      // Find the layout to use. If the saved layout is not valid, we use the
      // previous layout that is compatible with the current nodes.
      // If no previous layout is compatible, we use the computed layout.
      const activeLayout =
        savedLayout == null
          ? null
          : isSavedLayoutValid(nodes, savedLayout)
            ? savedLayout
            : getCompatiblePreviousLayout(nodes);

      const layouted = getLayoutedElements(
        getNodes(),
        getEdges(),
        activeLayout,
      );

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
      setInitialLayoutFinished(true);

      // Re-fit view if the layout has been reset
      if (savedLayout == null) {
        setInitialFitViewFinished(false);
      }

      const computedLayout = computeSolverLayout(layouted.nodes);
      if (!areSolverLayoutsEqual(savedLayout, computedLayout)) {
        logger.debug('-> Updating saved layout');
        useStore.getState().setSolverLayout(props.id!, computedLayout);
      }
    }

    // 2. Nodes are initialized and layouted, so we can fit the view.
    if (isMeasured && initialLayoutFinished && !initialFitViewFinished) {
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
  }, [
    nodesInitialized,
    savedLayout,
    initialLayoutFinished,
    initialFitViewFinished,
    getCompatiblePreviousLayout,
  ]);

  const ref = useRef<HTMLDivElement>(null);

  /**
   * On nodes change, we need to update the layout state and
   * save it.
   * If the layout is not valid (all zeros), we don't save it since
   * this means the layout is not initialized yet.
   */
  const handleNodesChange: OnNodesChange<SolutionNode> = useCallback(
    changes => {
      onNodesChange(changes);

      const updatedLayout = computeSolverLayout(getNodes());

      if (Object.values(updatedLayout).every(p => p.x == 0 && p.y == 0)) return;

      if (!isEqual(updatedLayout, savedLayout)) {
        if (areSavedLayoutsCompatible(updatedLayout, savedLayout)) {
          useStore.getState().setSolverLayout(props.id!, updatedLayout);
        } else if (savedLayout != null) {
          cachePreviousLayout(savedLayout);
        }
      }
    },
    [cachePreviousLayout, getNodes, onNodesChange, savedLayout, props.id],
  );

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
    <ReactFlow
      ref={ref}
      minZoom={0.2}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      connectionLineType={ConnectionLineType.SmoothStep}
      selectNodesOnDrag={false}
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
            <circle stroke="#2a8af6" strokeOpacity="0.75" r="2" cx="0" cy="0" />
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
  );
};
