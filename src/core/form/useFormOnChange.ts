import React, { useMemo, useRef } from 'react';

import { Path, PathValue } from '@clickbar/dot-diver';

type Updater<Obj, P extends Path<Obj> = Path<Obj>> = (
  path: P,
  value: any,
) => void;

type Value =
  | string
  | null
  | boolean
  | number
  | React.ChangeEvent<HTMLInputElement>;

export function useFormOnChange<Obj>(updater: Updater<Obj>) {
  const handlers = useRef<Record<string, (value: Value) => void>>({});

  return useMemo(() => {
    handlers.current = {};

    return (path: Path<Obj>) => {
      if (!handlers.current[path as string]) {
        handlers.current[path as string] = (value: Value) => {
          // console.log(
          //   'useFormOnChange',
          //   path,
          //   value,
          //   "type: + '" + typeof value + "'",
          // );
          if (typeof value === 'object' && value?.target) {
            value =
              value?.target?.type === 'checkbox'
                ? value.target.checked
                : value.target.value;
          }

          updater(path, value as unknown as PathValue<Obj, Path<Obj>>);
        };
      }
      return handlers.current[path as string];
    };
  }, [updater]);
}

export type FormOnChangeHandler<Obj> = (
  path: Path<Obj>,
) => (value: Value) => void;
