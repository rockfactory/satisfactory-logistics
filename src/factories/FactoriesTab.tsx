import { FactoryItemInput } from "./inputs/FactoryItemInput";

export interface IFactoriesTabProps {}

export function FactoriesTab(props: IFactoriesTabProps) {
  return (
    <div>
      <FactoryItemInput />
    </div>
  );
}
