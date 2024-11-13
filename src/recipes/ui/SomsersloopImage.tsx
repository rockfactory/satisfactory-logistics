import type { FactoryItemId } from '@/recipes/FactoryItemId';
import {
  FactoryItemImage,
  type IFactoryItemImageProps,
} from './FactoryItemImage';

export interface ISomersloopImageProps
  extends Omit<IFactoryItemImageProps, 'id'> {}

export function SomersloopImage(props: ISomersloopImageProps) {
  return <FactoryItemImage id={'Desc_WAT1_C' as FactoryItemId} {...props} />;
}
