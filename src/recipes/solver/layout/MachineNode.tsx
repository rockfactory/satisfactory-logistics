import { Badge, Box, Group, Image, Stack, Text } from '@mantine/core';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import { AllFactoryItemsMap } from '../../FactoryItem';
import { FactoryRecipe } from '../../FactoryRecipe';

export interface IMachineNodeData {
  label: string;
  value: number;
  recipe: FactoryRecipe;
  [key: string]: unknown;
}

export type IMachineNodeProps = NodeProps & {
  data: IMachineNodeData;
  type: 'Machine';
};

const MachineTypes = {
  Assembler: {
    image: '/images/assembler_256.png',
  },
  Constructor: {
    image: '/images/constructor_256.png',
  },
  Manufacturer: {
    image: '/images/manufacturer_256.png',
  },
  Refinery: {
    image: '/images/refinery_256.png',
  },
  Foundry: {
    image: '/images/foundry_256.png',
  },
  Smelter: {
    image: '/images/smelter_256.png',
  },
  Converter: {
    image: '/images/converter_256.png',
  },
  ParticleAccelerator: {
    image: '/images/particle-accelerator_256.png',
  },
  QuantumEncoder: {
    image: '/images/quantum-encoder_256.png',
  },
  Packager: {
    image: '/images/packager_256.png',
  },
  WaterExtractor: {
    image: '/images/water-extractor_256.png',
  },
  Extractor: {
    image: '/images/extractor_256.png',
  },
  Blender: {
    image: '/images/blender_256.png',
  },
};

export function getRecipeDisplayName(recipe: FactoryRecipe) {
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const isAlt = recipe.name.includes('Alternate');
  return isAlt ? recipe.name.replace('Alternate: ', '') : product.displayName;
}

export const MachineNode = memo((props: IMachineNodeProps) => {
  const { recipe } = props.data;
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const isAlt = recipe.name.includes('Alternate');
  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="dark.4">
      <Group gap="sm">
        <Image
          w="32"
          h="32"
          src={
            MachineTypes[recipe.producedIn as keyof typeof MachineTypes].image
          }
        />
        <Stack gap={2} align="center">
          <Group gap="xs">
            {isAlt && (
              <Badge size="xs" color="yellow">
                ALT
              </Badge>
            )}
            <Text size="sm">{getRecipeDisplayName(recipe)}</Text>
          </Group>
          <Text size="xs">{props.data.value}/min</Text>
        </Stack>
        <Image w="32" h="32" src={product.imagePath} />
      </Group>
      {/* <Handle type="source" position={Position.Top} id="source-top" /> */}
      <Handle type="source" position={Position.Right} id="source-right" />
      {/* <Handle type="source" position={Position.Bottom} id="source-bottom" /> */}
      {/* <Handle type="source" position={Position.Left} id="source-left" /> */}
      {/* <Handle type="target" position={Position.Top} id="target-top" /> */}
      {/* <Handle type="target" position={Position.Right} id="target-right" /> */}
      {/* <Handle type="target" position={Position.Bottom} id="target-bottom" /> */}
      <Handle type="target" position={Position.Left} id="target-left" />
    </Box>
  );
});
