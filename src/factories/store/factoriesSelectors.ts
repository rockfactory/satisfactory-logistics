import { type Path, setByPath } from '@clickbar/dot-diver';
import { useCallback, useMemo } from 'react';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useShallowStore, useStore } from '@/core/zustand';
import type { Factory } from '@/factories/Factory';
import type { FactoryOutputConsumer } from '@/solver/algorithm/solveProduction';
import type { SolverRequest } from '@/solver/store/Solver';

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

/**
 * Returns one entry per (downstream factory, input row) pair where the
 * input references the given factory id. Mirrors the scan used by
 * `OutputDependenciesTable` so the solver graph can show "output to
 * factory X" nodes symmetric to the existing "input from factory Y"
 * nodes.
 *
 * Returns `[]` when there is no current game (e.g. standalone solver).
 *
 * Implementation note: subscribes to a stringified signature (compared with
 * `===`) so re-renders happen only when something semantically relevant
 * changes, then materializes the typed result with `useMemo`. Returning
 * fresh objects directly from a store selector would defeat shallow compare
 * and cause infinite render loops via downstream `useMemo` deps.
 */
const SIGNATURE_SEP = '\u0001';
const FIELD_SEP = '\u0002';

export const useFactoryOutputConsumers = (
  id: string | null | undefined,
): FactoryOutputConsumer[] => {
  const sourceOutputs = useShallowStore(
    state => state.factories.factories[id ?? '']?.outputs ?? [],
  );

  const signature = useStore(state => {
    if (!id) return '';
    const gameId = state.games.selected;
    if (!gameId) return '';
    const factoriesIds = state.games.games[gameId]?.factoriesIds ?? [];
    const sourceFactory = state.factories.factories[id];
    if (!sourceFactory) return '';

    const parts: string[] = [];
    for (const factoryId of factoriesIds) {
      if (factoryId === id) continue;
      const factory = state.factories.factories[factoryId];
      if (!factory || factory.progress === 'disabled') continue;

      factory.inputs.forEach((input, inputIndex) => {
        if (input.factoryId !== id) return;
        if (!input.resource || input.amount == null) return;

        const matchingOutputIndex = sourceFactory.outputs.findIndex(
          o => o.resource === input.resource && o.destination !== 'depot',
        );
        const hasAnyOutputForResource = sourceFactory.outputs.some(
          o => o.resource === input.resource,
        );
        // Skip when the only matching outputs are depot uploads: they do
        // not propagate as supply to downstream factories.
        if (matchingOutputIndex < 0 && hasAnyOutputForResource) return;

        parts.push(
          [
            input.resource,
            input.amount,
            factory.id,
            factory.name ?? '',
            inputIndex,
            matchingOutputIndex >= 0 ? matchingOutputIndex : '',
          ].join(FIELD_SEP),
        );
      });
    }
    return parts.join(SIGNATURE_SEP);
  });

  return useMemo(() => {
    if (!signature) return [];
    return signature.split(SIGNATURE_SEP).map((row): FactoryOutputConsumer => {
      const [
        resource,
        amount,
        consumerFactoryId,
        consumerFactoryName,
        consumerInputIndex,
        outputIndex,
      ] = row.split(FIELD_SEP);
      const parsedOutputIndex =
        outputIndex === '' ? undefined : Number(outputIndex);
      return {
        resource,
        amount: Number(amount),
        consumerFactoryId,
        consumerFactoryName:
          consumerFactoryName === '' ? null : consumerFactoryName,
        consumerInputIndex: Number(consumerInputIndex),
        outputIndex: parsedOutputIndex,
        output:
          parsedOutputIndex != null
            ? sourceOutputs[parsedOutputIndex]
            : undefined,
      };
    });
  }, [signature, sourceOutputs]);
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
