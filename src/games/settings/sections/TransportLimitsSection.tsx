import { Image } from '@mantine/core';
import { SelectIconInput } from '@/core/form/SelectIconInput';
import {
  FactoryConveyorBelts,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { SettingSectionCard } from '../SettingSectionCard';
import {
  SETTINGS_SECTIONS,
  type SectionComponentProps,
} from '../settingsSections';

const section = SETTINGS_SECTIONS.find(s => s.id === 'transport')!;

const BeltsOptions = FactoryConveyorBelts.map(
  belt =>
    ({
      label: belt.name,
      value: belt.id,
      icon: <Image src={belt.imagePath} alt={belt.name} w={16} h={16} />,
    }) as const,
);

const PipelinesOptions = FactoryPipelinesExclAlternates.map(
  pipeline =>
    ({
      label: pipeline.name,
      value: pipeline.id,
      icon: (
        <Image src={pipeline.imagePath} alt={pipeline.name} w={16} h={16} />
      ),
    }) as const,
);

export function TransportLimitsSection({
  ref,
  settings,
  onChange,
}: SectionComponentProps) {
  return (
    <SettingSectionCard section={section} ref={ref}>
      <SelectIconInput
        label="Max Belt Level"
        data={BeltsOptions}
        description="Select the max belt level you have unlocked. Will be used to highlight belts in the calculator."
        value={settings?.maxBelt}
        clearable
        onChange={onChange('maxBelt')}
        placeholder="No belt selected"
      />
      <SelectIconInput
        label="Max Pipeline Level"
        data={PipelinesOptions}
        description="Select the max pipeline level you have unlocked. Will be used to highlight pipelines in the calculator."
        value={settings?.maxPipeline}
        clearable
        onChange={onChange('maxPipeline')}
        placeholder="No pipeline selected"
      />
    </SettingSectionCard>
  );
}
