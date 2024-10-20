import { useShallowStore, useStore } from '@/core/zustand';
import {
  getSolverGame,
  usePathSolverInstance,
} from '@/solver/store/solverSelectors';
import { Select } from '@mantine/core';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ISolverPickerProps {}

// TODO I don't like this. It's a bit of a hack to get the unlinked solvers and choosing one.
// Why can't I select, for example, from factories directly?
export function SolverPicker(props: ISolverPickerProps) {
  const unlinkedSolversIds = useShallowStore(state =>
    Object.values(state.solvers.instances)
      .filter(solver => !getSolverGame(state, solver.id))
      .map(solver => solver.id),
  );

  const unlinkedSolversNames = useShallowStore(state =>
    Object.values(state.solvers.instances)
      .filter(solver => !getSolverGame(state, solver.id))
      .map(solver => state.factories.factories[solver.id]?.name),
  );

  const unlinkedSolversOptions = useMemo(() => {
    return unlinkedSolversIds.map((id, index) => {
      return {
        label: unlinkedSolversNames[index] ?? 'Unnamed solver',
        value: id,
      };
    });
  }, [unlinkedSolversIds, unlinkedSolversNames]);

  const instance = usePathSolverInstance();
  const navigate = useNavigate();

  return (
    <Select
      data={unlinkedSolversOptions}
      placeholder="Switch solver"
      searchable
      value={instance?.id}
      onChange={value => {
        if (value) {
          useStore.getState().setCurrentSolver(value);
          navigate(`/factories/${value}/calculator`);
        }
      }}
    />
  );
}
