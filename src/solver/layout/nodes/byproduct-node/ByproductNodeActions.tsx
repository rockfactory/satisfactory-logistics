import { useFormOnChange, type Updater } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import type { FactoryOutput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { setByPath } from '@clickbar/dot-diver';
import { ActionIcon, Button, Group, Stack, Tooltip } from '@mantine/core';
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import { produce, type WritableDraft } from 'immer';
import { isEqual } from 'lodash';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { IByproductNodeData } from './ByproductNode';
import { ByproductNodeOutputConfig } from './ByproductNodeInputConfig';
import { useFactoryContext } from '@/FactoryContext';

export interface IByproductNodeActionsProps {
  id: string;
  data: IByproductNodeData;
}

export function ByproductNodeActions(props: IByproductNodeActionsProps) {
  const {
    id,
    data: { value, output, outputIndex },
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

  return (
    <Stack gap="sm" align="flex-start">
      <Group justify="space-between" w="100%">
        <Group gap="sm">
          {output && (
            <Tooltip label="Remove this output">
              <ActionIcon
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
          )}

          {output?.objective === 'max' && (
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

      {output && (
        <ByproductNodeOutputConfig
          resource={AllFactoryItemsMap[output.resource ?? '']}
          value={value}
          temporaryOutput={temporaryOutput}
          onChangeHandler={onChangeHandler}
        />
      )}
    </Stack>
  );
}
