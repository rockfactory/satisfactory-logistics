import { Badge, Box, Group, Image, Stack, Text } from '@mantine/core';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import { AllFactoryItemsMap } from '../../FactoryItem';
import { FactoryRecipe } from '../../FactoryRecipe';

export type IMachineNodeProps = NodeProps & {
  data: any;
  type: any;
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

export const MachineNode = memo((props: IMachineNodeProps) => {
  const recipe: FactoryRecipe = props.data.recipe;
  const product = AllFactoryItemsMap[recipe.product.resource];
  const isAlt = recipe.name.includes('Alternate');
  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="dark.4">
      <Group gap="sm">
        <Image
          w="48"
          h="48"
          src={
            MachineTypes[recipe.producedIn as keyof typeof MachineTypes].image
          }
        />
        <Stack gap="xs" align="center">
          <Group gap="xs">
            {isAlt && <Badge color="yellow">ALT</Badge>}

            {isAlt ? recipe.name : product.displayName}
          </Group>
          <Text size="sm">{props.data.value}/min</Text>
        </Stack>
        <Image w="48" h="48" src={product.imagePath} />
      </Group>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </Box>
  );
});
