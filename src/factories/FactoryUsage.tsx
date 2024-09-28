import { RingProgress, Text } from "@mantine/core";
import chroma from "chroma-js";
import { sum } from "lodash";
import { useSelector } from "react-redux";
import { RootState } from "../core/store";

export interface IFactoryUsageProps {
  factoryId: string;
}

const PercentageFormatter = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const colorScale = chroma
  .scale(["#E03C32", "#FFD301", "#7BB662"])
  .mode("lrgb")
  .padding(-0.1)
  .domain([1, 0]);

export function FactoryUsage(props: IFactoryUsageProps) {
  const factories = useSelector((state: RootState) => state.factories);
  const source = factories.factories.find((f) => f.id === props.factoryId);
  const producedAmount = source?.amount ?? 1;
  const usedAmount = sum(
    factories.factories.flatMap(
      (f) =>
        f.inputs
          ?.filter(
            (input) =>
              input.factoryId === props.factoryId &&
              input.resource === source?.output
          )
          .map((input) => input.amount ?? 0) ?? []
    )
  );

  return (
    <RingProgress
      label={
        <Text size="xs" ta="center">
          {PercentageFormatter.format(usedAmount / producedAmount)}
        </Text>
      }
      size={60}
      thickness={8}
      roundCaps
      sections={[
        {
          value: (usedAmount / producedAmount) * 100,
          color: colorScale(usedAmount / producedAmount).hex(),
        },
      ]}
    />
  );
}
