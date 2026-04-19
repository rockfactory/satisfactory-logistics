import { setByPath } from '@clickbar/dot-diver';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Stack,
  Tooltip,
} from '@mantine/core';
import { IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { produce, type WritableDraft } from 'immer';
import { isEqual } from 'lodash';
import { useState } from 'react';
import { type Updater, useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { useFactoryContext } from '@/FactoryContext';
import type { FactoryOutput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import type { IByproductNodeData } from './ByproductNode';
import { ByproductNodeOutputConfig } from './ByproductNodeInputConfig';
import { ByproductProcessFurtherAction } from './ByproductProcessFurtherAction';

export interface IByproductNodeActionsProps {
  id: string;
  data: IByproductNodeData;
}

export function ByproductNodeActions(props: IByproductNodeActionsProps) {
  const {
    data: { value, output, outputIndex, resource },
  } = props;
  const solverId = useFactoryContext();

  // Editable values
  const [temporaryOutput, setTemporaryOutput] = useState<FactoryOutput>(
    output!,
  );

  const temporaryUpdater: Updater<FactoryOutput> = (path, value) =>
    setTemporaryOutput(
      produce((draft: WritableDraft<FactoryOutput>) =>
        setByPath(draft, path, value),
      ),
    );

  const onChangeHandler = useFormOnChange(temporaryUpdater);

  // Apply changes
  const isApplyDisabled = !output || isEqual(output, temporaryOutput);

  const handleApply = () => {
    if (!output) return;
    console.log('Applying changes to output', temporaryOutput);
    useStore
      .getState()
      .updateFactoryOutput(solverId!, outputIndex!, temporaryOutput);
  };

  const handleSaveAsOutput = () => {
    useStore.getState().addFactoryOutput(solverId!, {
      resource: resource.id,
      amount: value,
      objective: 'default',
    });
  };

  return (
    <Stack gap="sm" align="flex-start">
      {!output && (
        <Tooltip label="Save as output">
          <ActionIcon
            color="blue"
            variant="outline"
            onClick={handleSaveAsOutput}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      {output && (
        <>
          <Group justify="space-between" w="100%">
            <Group gap="sm">
              <Tooltip label="Remove this output">
                <ActionIcon
                  data-tutorial-id="byproduct-action-remove"
                  color="red"
                  variant="outline"
                  onClick={() =>
                    useStore
                      .getState()
                      .removeFactoryOutput(solverId!, outputIndex!)
                  }
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>

              {output.objective === 'max' && (
                <Tooltip label="Save maximized amount">
                  <ActionIcon
                    color="blue"
                    variant="outline"
                    onClick={() =>
                      useStore
                        .getState()
                        .updateFactoryOutput(solverId!, outputIndex!, {
                          amount: value,
                        })
                    }
                  >
                    <IconDeviceFloppy size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            <Button
              variant={isApplyDisabled ? 'default' : 'filled'}
              color="blue"
              size="xs"
              disabled={isApplyDisabled}
              onClick={handleApply}
            >
              Apply
            </Button>
          </Group>

          <ByproductNodeOutputConfig
            resource={AllFactoryItemsMap[output.resource ?? '']}
            value={value}
            temporaryOutput={temporaryOutput}
            onChangeHandler={onChangeHandler}
          />

          <Divider w="100%" />
        </>
      )}

      <ByproductProcessFurtherAction resourceId={resource.id} />
    </Stack>
  );
}
