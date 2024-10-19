import { Image } from '@mantine/core';
import { AllFactoryItemsMap } from '../FactoryItem';

export interface IFactoryItemImageProps {
  id: string;
  size?: number;
}

export function FactoryItemImage(props: IFactoryItemImageProps) {
  const { size = 42 } = props;
  const item = AllFactoryItemsMap[props.id];
  const imagePath = item?.imagePath ?? '';
  return <Image w={size} h={size} src={imagePath} alt={item.displayName} />;
}
