import { Image } from '@mantine/core';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';

export interface IFactoryItemImageProps {
  id: string | null | undefined;
  size?: number;
  /** Force high resolution */
  highRes?: boolean;
}

export function FactoryItemImage(props: IFactoryItemImageProps) {
  const { size = 42, highRes = false } = props;
  if (!props.id) {
    return null;
  }

  const item = AllFactoryItemsMap[props.id];

  if (item.imageComponent) {
    return <item.imageComponent size={size} />;
  }

  const baseImagePath = item?.imagePath ?? '';
  // Lower resolution image for smaller sizes
  const imagePath =
    size <= 32 && !highRes
      ? baseImagePath.replace('_256', '_64')
      : baseImagePath;
  return <Image w={size} h={size} src={imagePath} alt={item.displayName} />;
}
