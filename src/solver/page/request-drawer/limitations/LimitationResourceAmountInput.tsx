import { useStore } from '@/core/zustand';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getWorldResourceMax } from '@/recipes/WorldResources';
import { useSolverResourcesAmount } from '@/solver/store/solverSelectors';
import { NumberInput } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { useFactoryContext } from '@/FactoryContext';

export interface ILimitationResourceAmountInputProps {
  resource: string;
}

export function LimitationResourceAmountInput(
  props: ILimitationResourceAmountInputProps,
) {
  const { resource } = props;
  const solverId = useFactoryContext();
  const resourceAmount = useSolverResourcesAmount(solverId)?.[resource];
  const resourceItem = AllFactoryItemsMap[resource];

  return (
    <div>
      <NumberInput
        w="100px"
        min={0}
        hideControls
        size="xs"
        value={resourceAmount}
        placeholder={getWorldResourceMax(resource)?.toString()}
        onValueChange={values => {
          useStore
            .getState()
            .setSolverResourcesAmount(
              solverId!,
              resource,
              values.value === '' || values.value === null
                ? undefined
                : values.floatValue,
            );
        }}
      />
    </div>
  );
}
