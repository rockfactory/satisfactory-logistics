import { Select, SelectProps } from "@mantine/core";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../core/store";

export interface IFactoryInputProps extends SelectProps {}

export function FactoryInput(props: IFactoryInputProps) {
  const factories = useSelector(
    (state: RootState) => state.factories.factories
  );

  const data = useMemo(
    () =>
      factories
        .filter((f) => f.name)
        .map((f) => ({ value: f.id, label: f.name! })),
    [factories]
  );

  return (
    <Select
      data={data}
      // label="Factories"
      searchable
      placeholder="Select factory"
      {...props}
    />
  );
}
