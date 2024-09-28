export interface FactoryItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  output: string;
  form: FactoryItemForm;
  sinkPoints: number;
  sinkable: boolean;
  powerConsumption: number;
  radioactiveDecay: number;
  canBeDiscarded: boolean;
  color: string;
  imagePath: string;
}

export enum FactoryItemForm {
  Solid = "Solid",
  Liquid = "Liquid",
  Gas = "Gas",
}
import RawFactoryItems from "./FactoryItems.json";

export const AllFactoryItems: FactoryItem[] = RawFactoryItems as FactoryItem[];

export const AllFactoryItemsMap = AllFactoryItems.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryItem>
);
