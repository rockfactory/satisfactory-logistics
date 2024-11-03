import { Stack } from '@mantine/core';
import { ReactFlowProvider } from '@xyflow/react';
import { FactoriesGraphLayout } from './FactoriesGraphLayout';
import { useFactoriesGraph } from './useFactoriesGraph';

export interface IFactoriesGraphContainer {}

export function FactoriesGraphContainer(props: IFactoriesGraphContainer) {
  const { nodes, edges } = useFactoriesGraph();
  return (
    <Stack gap="md">
      <ReactFlowProvider>
        <FactoriesGraphLayout
          nodes={nodes}
          edges={edges}
        ></FactoriesGraphLayout>
      </ReactFlowProvider>
    </Stack>
  );
}
