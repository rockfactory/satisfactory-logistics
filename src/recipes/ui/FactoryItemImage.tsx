import { Image, Tooltip } from '@mantine/core';
import type * as React from 'react';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';

export interface IFactoryItemImageProps {
  id: string | null | undefined;
  size?: number;
  /** Force high resolution */
  highRes?: boolean;
  /**
   * Wrap the rendered image in a Mantine `Tooltip` showing the item's
   * display name on hover. Off by default to keep existing call sites
   * unchanged; the codex passes this in to make icons self-describing.
   */
  withTooltip?: boolean;
}

export function FactoryItemImage(props: IFactoryItemImageProps) {
  const { size = 42, highRes = false, withTooltip = false } = props;
  if (!props.id) {
    return null;
  }

  const item = AllFactoryItemsMap[props.id];

  let content: React.ReactNode;
  if (item?.imageComponent) {
    content = <item.imageComponent size={size} />;
  } else {
    const baseImagePath = item?.imagePath ?? '';
    const imagePath =
      size <= 32 && !highRes
        ? baseImagePath.replace('_256', '_64')
        : baseImagePath;
    content = (
      <Image w={size} h={size} src={imagePath} alt={item?.displayName} />
    );
  }

  if (!withTooltip || !item) {
    return content;
  }

  return (
    <Tooltip label={item.displayName} withArrow openDelay={250}>
      <span style={{ display: 'inline-flex', lineHeight: 0 }}>{content}</span>
    </Tooltip>
  );
}
