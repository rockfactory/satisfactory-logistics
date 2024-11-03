import { getLayoutedElements } from '@/core/graph-layout/getLayoutedElements';
import { log } from '@/core/logger/log';
import { Box } from '@mantine/core';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useRef, useState } from 'react';
import { InputEdge } from './edges/input-edge/InputEdge';
import { FactoryNode } from './nodes/factory-node/FactoryNode';

const logger = log.getLogger('factories:graph-layout');
logger.setLevel('info');

interface FactoriesGraphLayoutProps {
  nodes: Node[];
  edges: Edge[];
  children?: React.ReactNode;
}

const nodeTypes = {
  Factory: FactoryNode,
};

const edgeTypes = {
  Input: InputEdge,
};

// TODO Centralize this, it's the same as in SolverLayout
export const FactoriesGraphLayout = (props: FactoriesGraphLayoutProps) => {
  const { fitView, getNodes, getEdges } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(props.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(props.edges);
  const [opacity, setOpacity] = useState(0);

  const nodesInitialized = useNodesInitialized();
  const [initialLayoutFinished, setInitialLayoutFinished] = useState(false);
  const [initialFitViewFinished, setInitialFitViewFinished] = useState(false);

  // When nodes change, we need to re-layout them.
  useEffect(() => {
    logger.debug('Initializing nodes...');
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
      fitView().then(() => {
        setOpacity(1);
        logger.debug('-> Fitting view completed');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, initialLayoutFinished, initialFitViewFinished]);

  const ref = useRef<HTMLDivElement>(null);

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
        fitView
        snapToGrid
        colorMode="dark"
        proOptions={{
          hideAttribution: true,
        }}
        snapGrid={[10, 10]}
      >
        <Controls showFitView />
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
      </ReactFlow>
    </Box>
  );
};
