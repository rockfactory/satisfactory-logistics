import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useShallowStore, useStore } from '@/core/zustand';
import { Factory } from '@/factories/Factory';
import { SolverRequest } from '@/solver/store/Solver';
import { Path, setByPath } from '@clickbar/dot-diver';
import { useCallback, useMemo } from 'react';

export const useFactoryOnChangeHandler = (id: string | null | undefined) => {
  const updater = useCallback(
    (path: Path<Factory | SolverRequest>, value: string | null | number) => {
      useStore.getState().updateFactoryAndSolverRequest(id!, obj => {
        setByPath(obj, path, value);
      });
    },
    [id],
  );

  return useFormOnChange<Factory | SolverRequest>(updater);
};

export const useFactoryInputsOutputs = (id: string | null | undefined) => {
  const inputs = useShallowStore(
    state => state.factories.factories[id ?? '']?.inputs ?? [],
  );
  const outputs = useShallowStore(
    state => state.factories.factories[id ?? '']?.outputs ?? [],
  );
  return useMemo(() => ({ inputs, outputs }), [inputs, outputs]);
};

export const useFactorySimpleAttributes = (id: string | null | undefined) => {
  return useShallowStore(state => {
    const factory = state.factories.factories[id ?? ''];
    return {
      id: factory?.id,
      name: factory?.name,
      description: factory?.description,
      progress: factory?.progress,
      boardIndex: factory?.boardIndex,
    };
  });
};

export type FactorySimpleAttributes = ReturnType<
  typeof useFactorySimpleAttributes
>;
