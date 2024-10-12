import { Path, setByPath } from '@clickbar/dot-diver';
import { useCallback } from 'react';
import { useFormOnChange } from '../../core/form/useFormOnChange';
import { useStore } from '../../core/zustand';
import { SolverRequest } from '../../solver/store/Solver';
import { Factory } from '../Factory';

export const useFactoryOnChangeHandler = (id: string | null | undefined) => {
  const updater = useCallback(
    (path: Path<Factory | SolverRequest>, value: string | null | number) => {
      useStore.getState().updateFactoryAndSolverRequest(id!, obj => {
        setByPath(obj, path, value);
      });
    },
    [id],
  );
  const onChangeHandler = useFormOnChange<Factory | SolverRequest>(updater);
  return onChangeHandler;
};
