import { Image } from '@mantine/core';
import { AllFactoryItemsMap } from '../FactoryItem';

export interface IFactoryItemImageProps {
  id: string | null | undefined;
  size?: number;
}

export function FactoryItemImage(props: IFactoryItemImageProps) {
  const { size = 42 } = props;
  if (!props.id) {
    return null;
  }

  const item = AllFactoryItemsMap[props.id];

  if (item.imageComponent) {
    return <item.imageComponent size={size} />;
  }

  const imagePath = item?.imagePath ?? '';
  return <Image w={size} h={size} src={imagePath} alt={item.displayName} />;
}
