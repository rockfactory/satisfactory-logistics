import type { FactoryItemId } from '../FactoryItemId';
import {
  FactoryItemImage,
  type IFactoryItemImageProps,
} from './FactoryItemImage';

export interface IOverclockImageProps
  extends Omit<IFactoryItemImageProps, 'id'> {}

export function OverclockImage(props: IOverclockImageProps) {
  return (
    <FactoryItemImage id={'Desc_CrystalShard_C' as FactoryItemId} {...props} />
  );
}
