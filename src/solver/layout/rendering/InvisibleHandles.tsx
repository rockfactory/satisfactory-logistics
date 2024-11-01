import { Handle, Position } from '@xyflow/react';

export interface IInvisibleHandlesProps {}

export function InvisibleHandles(props: IInvisibleHandlesProps) {
  return (
    <>
      <Handle
        style={{ visibility: 'hidden' }}
        type="source"
        position={Position.Top}
        id="source-top"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="source"
        position={Position.Right}
        id="source-right"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="source"
        position={Position.Bottom}
        id="source-bottom"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="source"
        position={Position.Left}
        id="source-left"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="target"
        position={Position.Top}
        id="target-top"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="target"
        position={Position.Right}
        id="target-right"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="target"
        position={Position.Bottom}
        id="target-bottom"
      />
      <Handle
        style={{ visibility: 'hidden' }}
        type="target"
        position={Position.Left}
        id="target-left"
      />
    </>
  );
}
